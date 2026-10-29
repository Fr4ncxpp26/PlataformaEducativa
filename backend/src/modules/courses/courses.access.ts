import { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../config/supabase';

export const isAdmin = (req: Request) => req.userRole === 'admin';

interface CourseAccess { id: string; teacher_id: string | null; is_published: boolean; price: number | null }

// Admin: todo. Profesor: solo sus cursos. Si no hay acceso responde y devuelve null.
export async function loadManageableCourse(req: Request, res: Response, courseId: string): Promise<CourseAccess | null> {
    if (!z.uuid().safeParse(courseId).success) { res.status(400).json({ error: 'ID inválido' }); return null; }
    const { data } = await supabaseAdmin.from('courses').select('id, teacher_id, is_published, price').eq('id', courseId).maybeSingle();
    if (!data) { res.status(404).json({ error: 'Curso no encontrado' }); return null; }
    if (!isAdmin(req) && data.teacher_id !== req.user!.id) {
        res.status(403).json({ error: 'No tienes acceso a este curso' });
        return null;
    }
    return data as CourseAccess;
}

// Resolución de la jerarquía Curso → Módulo → Lección → Pregunta
export const courseIdOfModule = async (id: string): Promise<string | null> =>
    (await supabaseAdmin.from('course_modules').select('course_id').eq('id', id).maybeSingle()).data?.course_id ?? null;

export const courseIdOfLesson = async (id: string): Promise<string | null> => {
    const { data } = await supabaseAdmin.from('lessons').select('module:module_id(course_id)').eq('id', id).maybeSingle();
    return (data as unknown as { module: { course_id: string } | null } | null)?.module?.course_id ?? null;
};

export const courseIdOfQuestion = async (id: string): Promise<string | null> => {
    const { data } = await supabaseAdmin.from('questions').select('lesson:lesson_id(module:module_id(course_id))').eq('id', id).maybeSingle();
    return (data as unknown as { lesson: { module: { course_id: string } | null } | null } | null)?.lesson?.module?.course_id ?? null;
};

export async function manageByResource(
    req: Request, res: Response, resolver: (id: string) => Promise<string | null>, id: string,
): Promise<CourseAccess | null> {
    if (!z.uuid().safeParse(id).success) { res.status(400).json({ error: 'ID inválido' }); return null; }
    const courseId = await resolver(id);
    if (!courseId) { res.status(404).json({ error: 'Recurso no encontrado' }); return null; }
    return loadManageableCourse(req, res, courseId);
}

export const canManageCourse = (user: { id: string; role: string }, course: any): boolean => {
    const role = String(user.role).toLowerCase();
    if (role === 'admin' || role === 'administrador') return true;

    // Permitir al profesor si es el dueño/instructor del curso
    if (role === 'profesor') {
        const ownerId = course.teacher_id ?? course.instructor_id ?? course.created_by;
        return ownerId === user.id;
    }

    return false;
};