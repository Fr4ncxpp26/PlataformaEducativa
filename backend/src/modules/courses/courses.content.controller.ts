import { Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase';
import { dbError, issueMessage, logAudit, paramId } from '../admin/admin.utils';
import {
    achievementSchema, achievementUpdateSchema, lessonSchema, lessonUpdateSchema, moduleSchema,
    moduleUpdateSchema, moveSchema, questionSchema, QUIZ_TYPES,
} from './courses.schemas';
import {
    courseIdOfLesson, courseIdOfModule, courseIdOfQuestion, loadManageableCourse, manageByResource,
} from './courses.access';

const nextPosition = async (table: 'course_modules' | 'lessons', fk: string, parentId: string) => {
    const { data } = await supabaseAdmin.from(table).select('position').eq(fk, parentId).order('position', { ascending: false }).limit(1);
    return ((data?.[0]?.position as number | undefined) ?? 0) + 1;
};

// Reordena intercambiando con el vecino y renumerando 1..n (sin posiciones repetidas)
const move = async (table: 'course_modules' | 'lessons', fk: string, id: string, parentId: string, dir: 'up' | 'down') => {
    const { data } = await supabaseAdmin.from(table).select('id, position').eq(fk, parentId).order('position');
    const order = (data ?? []).map((r) => r.id as string);
    const i = order.indexOf(id);
    const j = dir === 'up' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    await Promise.all(order.map((rowId, idx) => supabaseAdmin.from(table).update({ position: idx + 1 }).eq('id', rowId)));
};

// ---------- Módulos ----------
export const createModule = async (req: Request, res: Response) => {
    const courseId = paramId(req, res);
    if (!courseId || !(await loadManageableCourse(req, res, courseId))) return;
    const parsed = moduleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: issueMessage(parsed.error) });

    const { data, error } = await supabaseAdmin.from('course_modules').insert({
        ...parsed.data, is_published: parsed.data.is_published ?? true,
        course_id: courseId, position: await nextPosition('course_modules', 'course_id', courseId),
    }).select().single();
    if (error) return res.status(400).json({ error: dbError(error) });
    return res.status(201).json({ data });
};

export const updateModule = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    if (!id || !(await manageByResource(req, res, courseIdOfModule, id))) return;
    const parsed = moduleUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: issueMessage(parsed.error) });

    const { data, error } = await supabaseAdmin.from('course_modules').update(parsed.data).eq('id', id).select().single();
    if (error) return res.status(400).json({ error: dbError(error) });
    return res.status(200).json({ data });
};

export const deleteModule = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    if (!id || !(await manageByResource(req, res, courseIdOfModule, id))) return;
    const { error } = await supabaseAdmin.from('course_modules').delete().eq('id', id); // cascada: lecciones, preguntas, progreso
    if (error) return res.status(400).json({ error: dbError(error) });
    await logAudit(req, 'eliminar', 'modules', id);
    return res.status(200).json({ message: 'Módulo eliminado' });
};

export const moveModule = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    const course = id ? await manageByResource(req, res, courseIdOfModule, id) : null;
    if (!id || !course) return;
    const parsed = moveSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Dirección inválida' });
    await move('course_modules', 'course_id', id, course.id, parsed.data.direction);
    return res.status(200).json({ message: 'Orden actualizado' });
};

// ---------- Lecciones ----------
export const createLesson = async (req: Request, res: Response) => {
    const moduleId = paramId(req, res);
    if (!moduleId || !(await manageByResource(req, res, courseIdOfModule, moduleId))) return;
    const parsed = lessonSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: issueMessage(parsed.error) });

    const { data, error } = await supabaseAdmin.from('lessons').insert({
        ...parsed.data, is_published: parsed.data.is_published ?? true,
        module_id: moduleId, position: await nextPosition('lessons', 'module_id', moduleId),
    }).select().single();
    if (error) return res.status(400).json({ error: dbError(error) });
    return res.status(201).json({ data });
};

export const updateLesson = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    if (!id || !(await manageByResource(req, res, courseIdOfLesson, id))) return;
    const parsed = lessonUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: issueMessage(parsed.error) });

    const { data, error } = await supabaseAdmin.from('lessons').update(parsed.data).eq('id', id).select().single();
    if (error) return res.status(400).json({ error: dbError(error) });
    return res.status(200).json({ data });
};

export const deleteLesson = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    if (!id || !(await manageByResource(req, res, courseIdOfLesson, id))) return;
    const { error } = await supabaseAdmin.from('lessons').delete().eq('id', id);
    if (error) return res.status(400).json({ error: dbError(error) });
    await logAudit(req, 'eliminar', 'lessons', id);
    return res.status(200).json({ message: 'Lección eliminada' });
};

export const moveLesson = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    if (!id || !(await manageByResource(req, res, courseIdOfLesson, id))) return;
    const parsed = moveSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Dirección inválida' });
    const { data } = await supabaseAdmin.from('lessons').select('module_id').eq('id', id).single();
    await move('lessons', 'module_id', id, data!.module_id as string, parsed.data.direction);
    return res.status(200).json({ message: 'Orden actualizado' });
};

// ---------- Preguntas del quiz ----------
const insertOptions = (questionId: string, options: { text: string; is_correct: boolean }[]) =>
    supabaseAdmin.from('question_options').insert(options.map((o) => ({ ...o, question_id: questionId })));

export const createQuestion = async (req: Request, res: Response) => {
    const lessonId = paramId(req, res);
    if (!lessonId || !(await manageByResource(req, res, courseIdOfLesson, lessonId))) return;
    const parsed = questionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: issueMessage(parsed.error) });

    const { data: lesson } = await supabaseAdmin.from('lessons').select('type').eq('id', lessonId).single();
    if (!lesson || !QUIZ_TYPES.includes(lesson.type)) return res.status(400).json({ error: 'Solo ejercicios, quizzes y exámenes tienen preguntas' });

    const { options, ...q } = parsed.data;
    const { data: question, error } = await supabaseAdmin.from('questions').insert({ ...q, lesson_id: lessonId }).select().single();
    if (error) return res.status(400).json({ error: dbError(error) });

    const { error: optError } = await insertOptions(question.id, options);
    if (optError) {
        await supabaseAdmin.from('questions').delete().eq('id', question.id); // rollback
        return res.status(400).json({ error: dbError(optError) });
    }
    return res.status(201).json({ data: question });
};

export const updateQuestion = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    if (!id || !(await manageByResource(req, res, courseIdOfQuestion, id))) return;
    const parsed = questionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: issueMessage(parsed.error) });

    const { options, ...q } = parsed.data;
    const { error } = await supabaseAdmin.from('questions').update(q).eq('id', id);
    if (error) return res.status(400).json({ error: dbError(error) });

    await supabaseAdmin.from('question_options').delete().eq('question_id', id); // se reemplazan las opciones
    const { error: optError } = await insertOptions(id, options);
    if (optError) return res.status(400).json({ error: dbError(optError) });
    return res.status(200).json({ message: 'Pregunta actualizada' });
};

export const deleteQuestion = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    if (!id || !(await manageByResource(req, res, courseIdOfQuestion, id))) return;
    const { error } = await supabaseAdmin.from('questions').delete().eq('id', id);
    if (error) return res.status(400).json({ error: dbError(error) });
    return res.status(200).json({ message: 'Pregunta eliminada' });
};

// ---------- Logros del curso (recompensas) ----------
export const listCourseAchievements = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    if (!id || !(await loadManageableCourse(req, res, id))) return;
    const { data, error } = await supabaseAdmin.from('achievements').select('*').eq('course_id', id).order('name');
    if (error) return res.status(400).json({ error: dbError(error) });
    return res.status(200).json({ data });
};

export const createCourseAchievement = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    if (!id || !(await loadManageableCourse(req, res, id))) return;
    const parsed = achievementSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: issueMessage(parsed.error) });

    const { data, error } = await supabaseAdmin.from('achievements')
        .insert({ ...parsed.data, course_id: id, required_points: 0 }).select().single();
    if (error) return res.status(400).json({ error: dbError(error) });
    return res.status(201).json({ data });
};

const courseIdOfAchievement = async (id: string) =>
    (await supabaseAdmin.from('achievements').select('course_id').eq('id', id).maybeSingle()).data?.course_id as string | null ?? null;

export const updateCourseAchievement = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    if (!id || !(await manageByResource(req, res, courseIdOfAchievement, id))) return;
    const parsed = achievementUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: issueMessage(parsed.error) });
    const { data, error } = await supabaseAdmin.from('achievements').update(parsed.data).eq('id', id).select().single();
    if (error) return res.status(400).json({ error: dbError(error) });
    return res.status(200).json({ data });
};

export const deleteCourseAchievement = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    if (!id || !(await manageByResource(req, res, courseIdOfAchievement, id))) return;
    const { error } = await supabaseAdmin.from('achievements').delete().eq('id', id);
    if (error) return res.status(400).json({ error: dbError(error) });
    return res.status(200).json({ message: 'Logro eliminado' });
};