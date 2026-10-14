import { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../config/supabase';
import { dbError, sanitizeTerm } from '../admin/admin.utils';

// Catálogo abierto: solo cursos publicados y solo campos públicos
export const catalog = async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(24, Math.max(1, Number(req.query.pageSize) || 12));
    let q = supabaseAdmin.from('courses')
        .select('id, title, slug, description, level, image_url, price, subject:subject_id(name), teacher:teacher_id(nombre)', { count: 'exact' })
        .eq('is_published', true);
    const term = typeof req.query.q === 'string' ? sanitizeTerm(req.query.q) : '';
    if (term) q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
    if (typeof req.query.level === 'string' && req.query.level) q = q.eq('level', req.query.level);

    const { data, error, count } = await q.order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
    if (error) return res.status(400).json({ error: dbError(error) });
    return res.status(200).json({ data, total: count ?? 0, page, pageSize });
};

// Estructura del curso SIN contenido (título, tipo y duración de lecciones)
export const courseDetail = async (req: Request, res: Response) => {
    const { data: course } = await supabaseAdmin.from('courses')
        .select('id, title, slug, description, level, image_url, price, completion_points, subject:subject_id(name), teacher:teacher_id(nombre)')
        .eq('slug', String(req.params.slug)).eq('is_published', true).maybeSingle();
    if (!course) return res.status(404).json({ error: 'Curso no encontrado' });

    const { data: modules } = await supabaseAdmin.from('course_modules')
        .select('id, title, position, lessons(id, title, type, position, duration_minutes, is_free)')
        .eq('course_id', course.id).eq('is_published', true).eq('lessons.is_published', true).order('position');
    const sorted = ((modules ?? []) as unknown as { lessons: { position: number }[] }[]).map((m) => ({
        ...m, lessons: [...(m.lessons ?? [])].sort((a, b) => a.position - b.position),
    }));
    return res.status(200).json({ course, modules: sorted });
};

const maskName = (n: string) => {
    const p = n.trim().split(/\s+/);
    return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0];
};

// Verificación pública del folio. Los menores se muestran con nombre abreviado.
export const verifyCertificate = async (req: Request, res: Response) => {
    const id = String(req.params.id);
    if (!z.uuid().safeParse(id).success) return res.status(404).json({ error: 'Folio no válido' });

    const { data } = await supabaseAdmin.from('certificates')
        .select('id, issue_date, student:student_id(nombre, rol), course:course_id(title, teacher:teacher_id(nombre))')
        .eq('id', id).maybeSingle();
    if (!data) return res.status(404).json({ error: 'No existe un certificado con ese folio' });

    const c = data as unknown as {
        id: string; issue_date: string; student: { nombre: string; rol: string };
        course: { title: string; teacher: { nombre: string } | null };
    };
    return res.status(200).json({
        folio: c.id, issue_date: c.issue_date, course: c.course.title, instructor: c.course.teacher?.nombre ?? null,
        student: c.student.rol === 'alumno_menor' ? maskName(c.student.nombre) : c.student.nombre,
    });
};