import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../config/supabase';
import { dbError, issueMessage, logAudit, paramId, sanitizeTerm } from './admin.utils';

interface Cfg {
    table: string;
    select: string;
    order?: { column: string; ascending?: boolean };
    search?: string[];
    filters?: string[];
    create?: z.ZodType;
    update?: z.ZodType;
    remove?: boolean;
}

// ---------- Esquemas ----------
const uuid = z.uuid();
const optText = (max = 2000) => z.string().trim().max(max).nullable().optional();
const optUrl = z.url().nullable().optional();
const nonEmpty = <T extends z.ZodType>(s: T) =>
    s.refine((d) => Object.keys(d as object).length > 0, 'Nada que actualizar');

const subjectBase = z.strictObject({
    name: z.string().trim().min(2).max(100),
    description: optText(),
    icon_url: optUrl,
});

const enrollmentCreate = z.strictObject({
    student_id: uuid,
    course_id: uuid,
    access_type: z.enum(['purchased', 'subscription', 'free']).optional(),
});

const paymentUpdate = z.strictObject({ status: z.enum(['pendiente', 'completado', 'fallido', 'reembolsado']) });

const tutoringBase = z.strictObject({
    student_id: uuid,
    teacher_id: uuid,
    scheduled_at: z.iso.datetime(),
    status: z.enum(['programada', 'completada', 'cancelada']).optional(),
    meeting_url: optUrl,
    notes: optText(),
});

const certificateCreate = z.strictObject({ student_id: uuid, course_id: uuid });

const achievementBase = z.strictObject({
    name: z.string().trim().min(2).max(100),
    description: optText(),
    icon_url: optUrl,
    trigger_type: z.enum(['points', 'streak', 'lessons', 'courses', 'perfect_score']),
    threshold: z.number().int().min(1).max(1_000_000),
});

// ---------- Configuración de recursos ----------
const RESOURCES: Record<string, Cfg> = {
    subjects: {
        table: 'subjects', select: '*', order: { column: 'name', ascending: true }, search: ['name'],
        create: subjectBase, update: nonEmpty(subjectBase.partial()), remove: true,
    },
    enrollments: {
        table: 'enrollments', select: '*, student:student_id(nombre), course:course_id(title)',
        order: { column: 'created_at' }, filters: ['course_id', 'student_id', 'access_type'],
        create: enrollmentCreate, remove: true,
    },
    payments: {
        table: 'payments', select: '*, student:student_id(nombre), course:course_id(title)',
        order: { column: 'created_at' }, filters: ['status', 'student_id'],
        update: paymentUpdate, // los pagos NO se borran: son registro financiero
    },
    tutorings: {
        table: 'tutoring_sessions', select: '*, student:student_id(nombre), teacher:teacher_id(nombre)',
        order: { column: 'scheduled_at' }, filters: ['status', 'teacher_id', 'student_id'],
        create: tutoringBase, update: nonEmpty(tutoringBase.partial()), remove: true,
    },
    certificates: {
        table: 'certificates', select: '*, student:student_id(nombre), course:course_id(title)',
        order: { column: 'issue_date' }, filters: ['course_id', 'student_id'],
        create: certificateCreate, remove: true,
    },
    achievements: {
        table: 'achievements', select: '*', order: { column: 'threshold', ascending: true }, search: ['name'],
        create: achievementBase, update: nonEmpty(achievementBase.partial()), remove: true,
    },
    audit: {
        table: 'audit_logs', select: '*, admin:admin_id(nombre)', order: { column: 'created_at' },
        filters: ['entity', 'action', 'admin_id'],
    },
    guardianships: { // creación/borrado en admin.users.controller (clave compuesta)
        table: 'guardian_student', select: '*, guardian:guardian_id(nombre), student:student_id(nombre)',
    },
};

// ---------- Handlers genéricos ----------
const list = (cfg: Cfg) => async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));

    let q = supabaseAdmin.from(cfg.table).select(cfg.select, { count: 'exact' });
    const term = typeof req.query.q === 'string' ? sanitizeTerm(req.query.q) : '';
    if (term && cfg.search?.length) q = q.or(cfg.search.map((c) => `${c}.ilike.%${term}%`).join(','));
    for (const f of cfg.filters ?? []) {
        const v = req.query[f];
        if (typeof v === 'string' && v) q = q.eq(f, v);
    }
    if (cfg.order) q = q.order(cfg.order.column, { ascending: cfg.order.ascending ?? false });

    const { data, error, count } = await q.range((page - 1) * pageSize, page * pageSize - 1);
    if (error) {
        console.error(error);
        return res.status(400).json({ error: dbError(error) });
    }
    return res.status(200).json({ data, total: count ?? 0, page, pageSize });
};

const create = (name: string, cfg: Cfg) => async (req: Request, res: Response) => {
    const parsed = cfg.create!.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: issueMessage(parsed.error) });

    const { data, error } = await supabaseAdmin.from(cfg.table).insert(parsed.data as Record<string, unknown>).select().single();
    if (error) {
        console.error(error);
        return res.status(400).json({ error: dbError(error) });
    }
    await logAudit(req, 'crear', name, data.id, parsed.data);
    return res.status(201).json({ data });
};

const update = (name: string, cfg: Cfg) => async (req: Request, res: Response) => {
    const id = paramId(req, res);
    if (!id) return;
    const parsed = cfg.update!.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: issueMessage(parsed.error) });

    const { data, error } = await supabaseAdmin.from(cfg.table).update(parsed.data as Record<string, unknown>).eq('id', id).select().single();
    if (error) {
        if (error.code === 'PGRST116') return res.status(404).json({ error: 'Registro no encontrado' });
        console.error(error);
        return res.status(400).json({ error: dbError(error) });
    }
    await logAudit(req, 'editar', name, id, parsed.data);
    return res.status(200).json({ data });
};

const remove = (name: string, cfg: Cfg) => async (req: Request, res: Response) => {
    const id = paramId(req, res);
    if (!id) return;
    const { error } = await supabaseAdmin.from(cfg.table).delete().eq('id', id);
    if (error) {
        console.error(error);
        return res.status(400).json({ error: dbError(error) });
    }
    await logAudit(req, 'eliminar', name, id);
    return res.status(200).json({ message: 'Eliminado' });
};

export const registerResources = (router: Router) => {
    for (const [name, cfg] of Object.entries(RESOURCES)) {
        router.get(`/${name}`, list(cfg));
        if (cfg.create) router.post(`/${name}`, create(name, cfg));
        if (cfg.update) router.patch(`/${name}/:id`, update(name, cfg));
        if (cfg.remove) router.delete(`/${name}/:id`, remove(name, cfg));
    }
};