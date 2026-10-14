import { Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase';
import { dbError, issueMessage, logAudit, paramId, sanitizeTerm } from '../admin/admin.utils';
import { courseSchema, courseUpdateSchema, issueCertSchema } from './courses.schemas';
import { isAdmin, loadManageableCourse } from './courses.access';

export const subjectOptions = async (_req: Request, res: Response) => {
    const { data } = await supabaseAdmin.from('subjects').select('id, name').order('name').limit(500);
    return res.status(200).json({ data: (data ?? []).map((s) => ({ value: s.id as string, label: s.name as string })) });
};

export const listCourses = async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 15));

    let q = supabaseAdmin.from('courses')
        .select('*, subject:subject_id(name), teacher:teacher_id(nombre), enrollments(count)', { count: 'exact' });
    if (!isAdmin(req)) q = q.eq('teacher_id', req.user!.id);
    const term = typeof req.query.q === 'string' ? sanitizeTerm(req.query.q) : '';
    if (term) q = q.or(`title.ilike.%${term}%,slug.ilike.%${term}%`);
    if (req.query.is_published === 'true' || req.query.is_published === 'false') q = q.eq('is_published', req.query.is_published === 'true');
    if (typeof req.query.level === 'string' && req.query.level) q = q.eq('level', req.query.level);

    const { data, error, count } = await q.order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
    if (error) return res.status(400).json({ error: dbError(error) });
    return res.status(200).json({ data, total: count ?? 0, page, pageSize });
};

export const createCourse = async (req: Request, res: Response) => {
    const parsed = courseSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: issueMessage(parsed.error) });

    const body = {
        ...parsed.data,
        teacher_id: isAdmin(req) ? (parsed.data.teacher_id ?? req.user!.id) : req.user!.id, // el profesor solo crea a su nombre
        is_published: false, // todo curso nace como borrador
    };
    const { data, error } = await supabaseAdmin.from('courses').insert(body).select().single();
    if (error) return res.status(400).json({ error: dbError(error) });

    await logAudit(req, 'crear', 'courses', data.id, { title: data.title });
    return res.status(201).json({ data });
};

// Árbol completo para el editor: curso → módulos → lecciones → preguntas → opciones
export const getCourse = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    if (!id || !(await loadManageableCourse(req, res, id))) return;

    const { data, error } = await supabaseAdmin.from('courses')
        .select('*, modules:course_modules(*, lessons(*, questions(*, options:question_options(*))))').eq('id', id).single();
    if (error || !data) return res.status(404).json({ error: 'Curso no encontrado' });

    type Pos = { position: number };
    const byPos = (a: Pos, b: Pos) => a.position - b.position;
    const modules = ((data.modules ?? []) as (Pos & { lessons: Pos[] })[]).sort(byPos);
    modules.forEach((m) => m.lessons = (m.lessons ?? []).sort(byPos));
    return res.status(200).json({ data: { ...data, modules } });
};

export const updateCourse = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    if (!id || !(await loadManageableCourse(req, res, id))) return;
    const parsed = courseUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: issueMessage(parsed.error) });
    if (parsed.data.teacher_id !== undefined && !isAdmin(req)) {
        return res.status(403).json({ error: 'Solo un administrador puede reasignar el profesor' });
    }

    if (parsed.data.is_published === true) { // regla editorial: no publicar cursos vacíos
        const { data: total } = await supabaseAdmin.rpc('course_lesson_total', { p_course: id });
        if (!Number(total)) return res.status(400).json({ error: 'Agrega y publica al menos una lección (en un módulo publicado) antes de publicar el curso' });
    }

    const { data, error } = await supabaseAdmin.from('courses').update(parsed.data).eq('id', id).select().single();
    if (error) return res.status(400).json({ error: dbError(error) });

    await logAudit(req, 'editar', 'courses', id, parsed.data);
    return res.status(200).json({ data });
};

export const deleteCourse = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    if (!id || !(await loadManageableCourse(req, res, id))) return;

    const count = async (table: string) =>
        (await supabaseAdmin.from(table).select('*', { count: 'exact', head: true }).eq('course_id', id)).count ?? 0;
    const [certs, pays, enrolled] = await Promise.all([count('certificates'), count('payments'), count('enrollments')]);

    if (certs > 0 || pays > 0) {
        return res.status(409).json({ error: 'El curso tiene certificados o pagos asociados. Despublícalo en lugar de eliminarlo.' });
    }
    if (enrolled > 0 && !isAdmin(req)) {
        return res.status(409).json({ error: 'El curso tiene alumnos inscritos. Despublícalo o pide a un administrador que lo elimine.' });
    }

    const { error } = await supabaseAdmin.from('courses').delete().eq('id', id);
    if (error) return res.status(400).json({ error: dbError(error) });

    await logAudit(req, 'eliminar', 'courses', id);
    return res.status(200).json({ message: 'Curso eliminado' });
};

// ---------- Alumnos y certificados del curso ----------
export const courseStudents = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    if (!id || !(await loadManageableCourse(req, res, id))) return;

    const { data: enr, error } = await supabaseAdmin.from('enrollments')
        .select('student_id, access_type, created_at, student:student_id(nombre)')
        .eq('course_id', id).order('created_at', { ascending: false }).limit(200);
    if (error) return res.status(400).json({ error: dbError(error) });

    const ids = (enr ?? []).map((e) => e.student_id as string);
    const { data: total } = await supabaseAdmin.rpc('course_lesson_total', { p_course: id });
    const { data: prog } = ids.length ? await supabaseAdmin.rpc('course_progress', { p_course: id, p_students: ids }) : { data: [] };
    const { data: certs } = await supabaseAdmin.from('certificates').select('id, student_id').eq('course_id', id);

    const done = new Map(((prog ?? []) as { student_id: string; completed: number }[]).map((p) => [p.student_id, p.completed]));
    const cert = new Map((certs ?? []).map((c) => [c.student_id as string, c.id as string]));
    const totalN = Number(total ?? 0);

    const rows = (enr ?? []).map((e) => {
        const completed = done.get(e.student_id as string) ?? 0;
        return {
            student_id: e.student_id,
            nombre: (e.student as unknown as { nombre: string } | null)?.nombre ?? '—',
            access_type: e.access_type, enrolled_at: e.created_at,
            completed, total: totalN, percent: totalN ? Math.round((completed / totalN) * 100) : 0,
            certificate_id: cert.get(e.student_id as string) ?? null,
        };
    });
    return res.status(200).json({ data: rows });
};

export const issueCertificate = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    if (!id || !(await loadManageableCourse(req, res, id))) return;
    const parsed = issueCertSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: issueMessage(parsed.error) });

    const { data: enr } = await supabaseAdmin.from('enrollments').select('id')
        .eq('course_id', id).eq('student_id', parsed.data.student_id).maybeSingle();
    if (!enr) return res.status(400).json({ error: 'El alumno no está inscrito en este curso' });

    const { data, error } = await supabaseAdmin.from('certificates')
        .insert({ course_id: id, student_id: parsed.data.student_id }).select('id').single();
    if (error) return res.status(error.code === '23505' ? 409 : 400).json({ error: error.code === '23505' ? 'El alumno ya tiene certificado' : dbError(error) });

    await logAudit(req, 'crear', 'certificates', data.id, { course_id: id, manual: true });
    return res.status(201).json({ data });
};

// Resumen del profesor (admin ve el de sus propios cursos)
export const teacherOverview = async (req: Request, res: Response) => {
    const uid = req.user!.id;
    const { data } = await supabaseAdmin.from('courses')
        .select('id, title, slug, is_published, enrollments(count), certificates(count)')
        .eq('teacher_id', uid).order('created_at', { ascending: false });
    const courses = (data ?? []).map((c) => ({
        id: c.id as string, title: c.title as string, slug: c.slug as string, is_published: c.is_published as boolean,
        students: (c.enrollments as unknown as { count: number }[])?.[0]?.count ?? 0,
        graduates: (c.certificates as unknown as { count: number }[])?.[0]?.count ?? 0,
    }));
    const { count: upcoming } = await supabaseAdmin.from('tutoring_sessions').select('*', { count: 'exact', head: true })
        .eq('teacher_id', uid).eq('status', 'programada').gte('scheduled_at', new Date().toISOString());
    return res.status(200).json({
        courses,
        totals: {
            courses: courses.length, published: courses.filter((c) => c.is_published).length,
            students: courses.reduce((n, c) => n + c.students, 0), graduates: courses.reduce((n, c) => n + c.graduates, 0),
            upcoming: upcoming ?? 0,
        },
    });
};