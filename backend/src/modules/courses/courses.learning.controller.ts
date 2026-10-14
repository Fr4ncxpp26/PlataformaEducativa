import { Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase';
import { dbError, issueMessage, paramId } from '../admin/admin.utils';
import { QUIZ_TYPES, completeSchema, quizSubmitSchema } from './courses.schemas';
import {
    achievementValue, checkGlobalAchievements, completeLessonOnce, evaluateCourseCompletion, registerActivity, studentStats,
} from './courses.rewards';
import { computeLocks, loadDone, loadStructure } from './courses.locks';
import { studentCourses, weekActivity } from './courses.progress';

const isEnrolled = async (studentId: string, courseId: string) =>
    !!(await supabaseAdmin.from('enrollments').select('id').eq('student_id', studentId).eq('course_id', courseId).maybeSingle()).data;

interface LessonRow {
    id: string; title: string; type: string; content_url: string | null; text_content: string | null; points: number;
    duration_minutes: number | null; is_free: boolean; is_published: boolean; pass_score: number | null; max_attempts: number | null;
}
interface CourseRow { id: string; is_published: boolean; pass_score: number; sequential_units: boolean }

// Carga la lección y valida: publicada + (inscrito o gratuita) + no bloqueada por reglas de unidad
async function loadLesson(req: Request, res: Response, id: string, requireEnrollment: boolean) {
    const { data } = await supabaseAdmin.from('lessons')
        .select('id, title, type, content_url, text_content, points, duration_minutes, is_free, is_published, pass_score, max_attempts, module:module_id(is_published, course:course_id(id, is_published, pass_score, sequential_units))')
        .eq('id', id).maybeSingle();
    if (!data) { res.status(404).json({ error: 'Lección no encontrada' }); return null; }

    const { module: mod, ...lesson } = data as unknown as LessonRow & { module: { is_published: boolean; course: CourseRow } };
    if (!lesson.is_published || !mod.is_published || !mod.course.is_published) {
        res.status(404).json({ error: 'Lección no disponible' });
        return null;
    }
    const enrolled = await isEnrolled(req.user!.id, mod.course.id);
    if (!enrolled && (requireEnrollment || !lesson.is_free)) {
        res.status(403).json({ error: 'Debes inscribirte en el curso', code: 'NOT_ENROLLED' });
        return null;
    }
    if (enrolled) {
        const [structure, done] = await Promise.all([loadStructure(mod.course.id), loadDone(req.user!.id, mod.course.id)]);
        const reason = computeLocks(structure, done, mod.course.sequential_units).get(id);
        if (reason) { res.status(403).json({ error: reason, code: 'LOCKED' }); return null; }
    }
    return { lesson, course: mod.course };
}

const attemptsOf = async (uid: string, lessonId: string) =>
    (await supabaseAdmin.from('quiz_attempts').select('*', { count: 'exact', head: true }).eq('student_id', uid).eq('lesson_id', lessonId)).count ?? 0;

export const myCourses = async (req: Request, res: Response) => res.status(200).json({ data: await studentCourses(req.user!.id) });

export const enroll = async (req: Request, res: Response) => {
    const courseId = paramId(req, res);
    if (!courseId) return;
    const { data: course } = await supabaseAdmin.from('courses').select('id, price, is_published').eq('id', courseId).maybeSingle();
    if (!course || !course.is_published) return res.status(404).json({ error: 'Curso no disponible' });
    if (Number(course.price) > 0) return res.status(402).json({ error: 'Este curso requiere pago', code: 'PAYMENT_REQUIRED' }); // pendiente: Stripe
    const { error } = await supabaseAdmin.from('enrollments').insert({ student_id: req.user!.id, course_id: courseId, access_type: 'free' });
    if (error && error.code !== '23505') return res.status(400).json({ error: dbError(error) });
    return res.status(error ? 200 : 201).json({ message: error ? 'Ya estabas inscrito' : 'Inscripción exitosa' });
};

export const courseOutline = async (req: Request, res: Response) => {
    const uid = req.user!.id;
    const { data: course } = await supabaseAdmin.from('courses')
        .select('id, title, slug, description, level, pass_score, completion_points, sequential_units, is_published, teacher:teacher_id(nombre)')
        .eq('slug', String(req.params.slug)).maybeSingle();
    if (!course || !course.is_published) return res.status(404).json({ error: 'Curso no disponible' });
    if (!(await isEnrolled(uid, course.id))) return res.status(403).json({ error: 'No estás inscrito en este curso', code: 'NOT_ENROLLED' });

    const { data: modules } = await supabaseAdmin.from('course_modules')
        .select('id, title, position, lessons(id, title, type, position, duration_minutes, points, is_free)')
        .eq('course_id', course.id).eq('is_published', true).eq('lessons.is_published', true).order('position');
    const sorted = ((modules ?? []) as unknown as { id: string; lessons: { id: string; type: string; position: number }[] }[]).map((m) => ({
        ...m, lessons: [...(m.lessons ?? [])].sort((a, b) => a.position - b.position),
    }));

    const done = await loadDone(uid, course.id);
    const locks = computeLocks(sorted, done, course.sequential_units);
    const withLocks = sorted.map((m) => ({ ...m, lessons: m.lessons.map((l) => ({ ...l, locked: locks.get(l.id) ?? null })) }));
    const { data: cert } = await supabaseAdmin.from('certificates').select('id').eq('student_id', uid).eq('course_id', course.id).maybeSingle();

    return res.status(200).json({ course, modules: withLocks, completedLessonIds: [...done], certificateId: cert?.id ?? null });
};

export const getLesson = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    const ctx = id ? await loadLesson(req, res, id, false) : null;
    if (!id || !ctx) return;
    const { lesson, course } = ctx;

    let questions = null;
    let lastAttempt = null;
    let attemptsUsed = 0;
    if (QUIZ_TYPES.includes(lesson.type)) {
        // Jamás se envía is_correct ni explanation antes de responder
        const { data } = await supabaseAdmin.from('questions').select('id, prompt, difficulty, options:question_options(id, text)').eq('lesson_id', id).order('created_at');
        questions = data ?? [];
        const { data: att } = await supabaseAdmin.from('quiz_attempts').select('score, passed, attempt_number, created_at')
            .eq('student_id', req.user!.id).eq('lesson_id', id).order('created_at', { ascending: false }).limit(1);
        lastAttempt = att?.[0] ?? null;
        attemptsUsed = await attemptsOf(req.user!.id, id);
    }
    return res.status(200).json({
        lesson: { id: lesson.id, title: lesson.title, type: lesson.type, content_url: lesson.content_url, text_content: lesson.text_content, points: lesson.points, duration_minutes: lesson.duration_minutes },
        questions, passScore: lesson.pass_score ?? course.pass_score, maxAttempts: lesson.max_attempts, attemptsUsed, lastAttempt,
    });
};

export const completeLesson = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    const ctx = id ? await loadLesson(req, res, id, true) : null;
    if (!id || !ctx) return;
    if (QUIZ_TYPES.includes(ctx.lesson.type)) return res.status(400).json({ error: 'Esta lección se completa respondiendo la evaluación' });
    const parsed = completeSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: issueMessage(parsed.error) });

    await registerActivity(req.user!.id);
    const r = await completeLessonOnce(req.user!.id, id, ctx.lesson.points, parsed.data.time_spent_seconds ?? 0);
    const course = await evaluateCourseCompletion(req.user!.id, ctx.course.id);
    return res.status(200).json({ ...r, course });
};

export const submitQuiz = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    const ctx = id ? await loadLesson(req, res, id, true) : null;
    if (!id || !ctx) return;
    const { lesson, course } = ctx;
    if (!QUIZ_TYPES.includes(lesson.type)) return res.status(400).json({ error: 'Esta lección no es una evaluación' });
    const parsed = quizSubmitSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Respuestas inválidas' });

    const used = await attemptsOf(req.user!.id, id);
    if (lesson.max_attempts && used >= lesson.max_attempts) return res.status(403).json({ error: 'Agotaste tus intentos para esta evaluación' });

    const { data } = await supabaseAdmin.from('questions').select('id, explanation, options:question_options(id, is_correct)').eq('lesson_id', id);
    const questions = (data ?? []) as unknown as { id: string; explanation: string | null; options: { id: string; is_correct: boolean }[] }[];
    if (questions.length === 0) return res.status(400).json({ error: 'Esta evaluación aún no tiene preguntas' });

    const answers = parsed.data.answers;
    for (const q of questions) {
        if (!q.options.some((o) => o.id === answers[q.id])) return res.status(400).json({ error: 'Responde todas las preguntas' });
    }
    const graded = questions.map((q) => ({ q, correct: q.options.find((o) => o.id === answers[q.id])?.is_correct === true }));
    const correct = graded.filter((g) => g.correct).length;
    const score = Math.round((correct / questions.length) * 10000) / 100;
    const passScore = lesson.pass_score ?? course.pass_score;
    const practice = lesson.type === 'ejercicio'; // los ejercicios son práctica: siempre se completan
    const passed = practice || score >= passScore;

    await supabaseAdmin.from('quiz_attempts').insert({ student_id: req.user!.id, lesson_id: id, score, passed, attempt_number: used + 1 });
    await registerActivity(req.user!.id);

    let reward = null;
    if (passed) {
        const r = await completeLessonOnce(req.user!.id, id, lesson.points);
        const extra = score === 100 ? await checkGlobalAchievements(req.user!.id) : []; // "Examen perfecto"
        reward = { ...r, achievements: [...r.achievements, ...extra], course: await evaluateCourseCompletion(req.user!.id, course.id) };
    }
    return res.status(200).json({
        score, passed, correct, total: questions.length, passScore: practice ? 0 : passScore,
        attemptsLeft: lesson.max_attempts ? Math.max(0, lesson.max_attempts - used - 1) : null,
        // Las respuestas correctas se revelan al aprobar (evita memorizarlas entre intentos)
        review: graded.map((g) => ({
            questionId: g.q.id, correct: g.correct, explanation: g.correct ? null : g.q.explanation,
            correctOptionId: passed ? g.q.options.find((o) => o.is_correct)?.id ?? null : null,
        })),
        reward,
    });
};

export const gamification = async (req: Request, res: Response) => {
    const uid = req.user!.id;
    const [stats, week] = await Promise.all([studentStats(uid), weekActivity(uid)]);
    const { data: global } = await supabaseAdmin.from('achievements').select('id, name, description, icon_url, trigger_type, threshold').is('course_id', null).order('threshold');
    const { data: earned } = await supabaseAdmin.from('student_achievements')
        .select('awarded_at, achievement:achievement_id(id, name, description, icon_url, course:course_id(title))')
        .eq('student_id', uid).order('awarded_at', { ascending: false });
    const earnedIds = new Set((earned ?? []).map((e) => (e.achievement as unknown as { id: string }).id));
    const catalog = (global ?? []).map((a) => ({
        ...a, value: Math.min(achievementValue(stats, a.trigger_type as string), Number(a.threshold)), earned: earnedIds.has(a.id as string),
    }));
    return res.status(200).json({ stats, week, earned: earned ?? [], catalog });
};

export const myCertificates = async (req: Request, res: Response) => {
    const { data, error } = await supabaseAdmin.from('certificates')
        .select('id, issue_date, course:course_id(title, teacher:teacher_id(nombre))')
        .eq('student_id', req.user!.id).order('issue_date', { ascending: false });
    if (error) return res.status(400).json({ error: dbError(error) });
    return res.status(200).json({ data });
};

// Todo lo del dashboard del alumno en una sola petición
export const dashboard = async (req: Request, res: Response) => {
    const uid = req.user!.id;
    const [stats, week, courses] = await Promise.all([studentStats(uid), weekActivity(uid), studentCourses(uid)]);
    const { data: tutors } = await supabaseAdmin.from('guardian_student').select('guardian:guardian_id(id, nombre, avatar_url)').eq('student_id', uid);
    const { data: sessions } = await supabaseAdmin.from('tutoring_sessions')
        .select('id, scheduled_at, meeting_url, teacher:teacher_id(nombre)')
        .eq('student_id', uid).eq('status', 'programada').gte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(3);
    const { data: badges } = await supabaseAdmin.from('student_achievements')
        .select('achievement:achievement_id(id, name, icon_url)').eq('student_id', uid).order('awarded_at', { ascending: false }).limit(4);
    const { data: pub } = await supabaseAdmin.from('courses')
        .select('id, title, slug, description, level, image_url, price, subject:subject_id(name), teacher:teacher_id(nombre)')
        .eq('is_published', true).order('created_at', { ascending: false }).limit(12);
    const enrolled = new Set(courses.map((c) => c.course.id));

    return res.status(200).json({
        stats, week, courses,
        tutors: (tutors ?? []).map((t) => t.guardian),
        sessions: sessions ?? [],
        badges: (badges ?? []).map((b) => b.achievement),
        suggested: (pub ?? []).filter((c) => !enrolled.has(c.id as string)).slice(0, 3),
    });
};