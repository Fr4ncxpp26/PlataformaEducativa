import { supabaseAdmin } from '../../config/supabase';
import { env } from '../../config/env';
import { dayKey } from '../../utils/time';

export interface EarnedAchievement { id: string; name: string; icon_url: string | null }
export interface CompletionResult {
    completed: boolean; newlyCompleted: boolean; done: number; total: number;
    certificateId?: string; points?: number; achievements?: EarnedAchievement[];
}
export interface StudentStats { points: number; streak: number; maxStreak: number; lessons: number; courses: number; perfect: number }

const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

// Estadísticas del alumno (la racha mostrada se reinicia si faltó ayer y hoy)
export async function studentStats(uid: string): Promise<StudentStats> {
    const { data: p } = await supabaseAdmin.from('profiles')
        .select('puntos_totales, racha_actual, racha_maxima, ultima_actividad').eq('id', uid).single();
    const [lessons, courses, perfect] = await Promise.all([
        count(supabaseAdmin.from('progress').select('*', { count: 'exact', head: true }).eq('student_id', uid).eq('completed', true)),
        count(supabaseAdmin.from('certificates').select('*', { count: 'exact', head: true }).eq('student_id', uid)),
        count(supabaseAdmin.from('quiz_attempts').select('*', { count: 'exact', head: true }).eq('student_id', uid).eq('score', 100)),
    ]);
    const yesterday = dayKey(new Date(Date.now() - 864e5), env.APP_TIMEZONE);
    const last = (p?.ultima_actividad as string | null) ?? null;
    const streak = last && last >= yesterday ? Number(p?.racha_actual ?? 0) : 0;
    return { points: Number(p?.puntos_totales ?? 0), streak, maxStreak: Math.max(Number(p?.racha_maxima ?? 0), streak), lessons, courses, perfect };
}

export const achievementValue = (s: StudentStats, trigger: string) =>
    ({ points: s.points, streak: s.maxStreak, lessons: s.lessons, courses: s.courses, perfect_score: s.perfect } as Record<string, number>)[trigger] ?? 0;

// Otorga insignias; el upsert con ignoreDuplicates solo devuelve las NUEVAS
const grant = async (studentId: string, list: EarnedAchievement[]): Promise<EarnedAchievement[]> => {
    if (list.length === 0) return [];
    const { data } = await supabaseAdmin.from('student_achievements')
        .upsert(list.map((a) => ({ student_id: studentId, achievement_id: a.id })), { onConflict: 'student_id,achievement_id', ignoreDuplicates: true })
        .select('achievement_id');
    const added = new Set((data ?? []).map((r) => r.achievement_id as string));
    return list.filter((a) => added.has(a.id));
};

// Insignias generales (puntos, racha, lecciones, certificados, examen perfecto)
export async function checkGlobalAchievements(uid: string): Promise<EarnedAchievement[]> {
    const stats = await studentStats(uid);
    const { data } = await supabaseAdmin.from('achievements').select('id, name, icon_url, trigger_type, threshold').is('course_id', null).gt('threshold', 0);
    const reached = (data ?? []).filter((a) => achievementValue(stats, a.trigger_type as string) >= Number(a.threshold));
    return grant(uid, reached.map((a) => ({ id: a.id as string, name: a.name as string, icon_url: (a.icon_url as string | null) ?? null })));
}

// Registra actividad del día (racha) sin sumar puntos
export const registerActivity = async (uid: string) => {
    await supabaseAdmin.rpc('award_points', { p_user: uid, p_points: 0, p_tz: env.APP_TIMEZONE });
};

// Suma puntos + racha (función SQL atómica) y revisa insignias generales
export async function awardPoints(uid: string, points: number): Promise<EarnedAchievement[]> {
    await supabaseAdmin.rpc('award_points', { p_user: uid, p_points: Math.max(0, points), p_tz: env.APP_TIMEZONE });
    return checkGlobalAchievements(uid);
}

// Completa la lección UNA sola vez (transición atómica false→true) y da puntos
export async function completeLessonOnce(studentId: string, lessonId: string, points: number, seconds = 0) {
    await supabaseAdmin.from('progress')
        .upsert({ student_id: studentId, lesson_id: lessonId }, { onConflict: 'student_id,lesson_id', ignoreDuplicates: true });
    const { data: changed } = await supabaseAdmin.from('progress')
        .update({ completed: true, completed_at: new Date().toISOString(), time_spent_seconds: seconds })
        .eq('student_id', studentId).eq('lesson_id', lessonId).eq('completed', false).select('id');
    const firstTime = (changed?.length ?? 0) > 0;
    const achievements = firstTime ? await awardPoints(studentId, points) : [];
    return { firstTime, pointsEarned: firstTime ? points : 0, achievements };
}

// Curso terminado (incluye examen final): certificado + bono + insignias del curso (una sola vez)
export async function evaluateCourseCompletion(studentId: string, courseId: string): Promise<CompletionResult> {
    const { data: total } = await supabaseAdmin.rpc('course_lesson_total', { p_course: courseId });
    const { data: prog } = await supabaseAdmin.rpc('course_progress', { p_course: courseId, p_students: [studentId] });
    const totalN = Number(total ?? 0);
    const done = Number((prog as { completed: number }[] | null)?.[0]?.completed ?? 0);
    if (totalN === 0 || done < totalN) return { completed: false, newlyCompleted: false, done, total: totalN };

    const { data: cert, error } = await supabaseAdmin.from('certificates')
        .insert({ student_id: studentId, course_id: courseId }).select('id').single();
    if (error) { // UNIQUE(student_id, course_id): ya lo tenía
        const { data: existing } = await supabaseAdmin.from('certificates').select('id')
            .eq('student_id', studentId).eq('course_id', courseId).maybeSingle();
        return { completed: true, newlyCompleted: false, done, total: totalN, certificateId: existing?.id };
    }

    const { data: course } = await supabaseAdmin.from('courses').select('completion_points').eq('id', courseId).single();
    const points = Number(course?.completion_points ?? 0);
    const byPoints = await awardPoints(studentId, points); // también revisa "certificados obtenidos"
    const { data: ach } = await supabaseAdmin.from('achievements').select('id, name, icon_url').eq('course_id', courseId);
    const byCourse = await grant(studentId, (ach ?? []) as EarnedAchievement[]);
    return { completed: true, newlyCompleted: true, done, total: totalN, certificateId: cert.id, points, achievements: [...byCourse, ...byPoints] };
}