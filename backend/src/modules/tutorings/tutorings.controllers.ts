import { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../config/supabase';
import { env } from '../../config/env';
import { dbError, issueMessage, paramId } from '../admin/admin.utils';
import { dowOfDate, localDow, localMinutes, zonedToUtc } from '../../utils/time';

const SESSION_MIN = 60;      // duración fija de cada tutoría
const MAX_DAYS_AHEAD = 60;
const HOUR = 3600000;

const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const pad = (n: number) => String(n).padStart(2, '0');

const availabilitySchema = z.strictObject({
    day_of_week: z.number().int().min(0).max(6),
    start_time: z.string().regex(timeRe, 'Hora inválida (HH:MM)'),
    end_time: z.string().regex(timeRe, 'Hora inválida (HH:MM)'),
}).refine((a) => toMin(a.end_time) - toMin(a.start_time) >= SESSION_MIN, 'Cada bloque debe durar al menos 60 minutos');

const sessionUpdateSchema = z.strictObject({
    status: z.enum(['programada', 'completada', 'cancelada']).optional(),
    meeting_url: z.url().refine((u) => u.startsWith('https://'), 'Debe ser https').nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
}).refine((d) => Object.keys(d).length > 0, 'Nada que actualizar');

// ---------- Profesor: disponibilidad ----------
export const listAvailability = async (req: Request, res: Response) => {
    const { data, error } = await supabaseAdmin.from('teacher_availability').select('*').eq('teacher_id', req.user!.id).order('day_of_week').order('start_time');
    if (error) return res.status(400).json({ error: dbError(error) });
    return res.status(200).json({ data });
};

export const addAvailability = async (req: Request, res: Response) => {
    const parsed = availabilitySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: issueMessage(parsed.error) });
    const a = parsed.data;

    const { data: same } = await supabaseAdmin.from('teacher_availability').select('start_time, end_time').eq('teacher_id', req.user!.id).eq('day_of_week', a.day_of_week);
    if ((same ?? []).some((x) => toMin(a.start_time) < toMin(x.end_time as string) && toMin(a.end_time) > toMin(x.start_time as string))) {
        return res.status(409).json({ error: 'Ese bloque se empalma con otro ya registrado' });
    }
    const { data, error } = await supabaseAdmin.from('teacher_availability').insert({ ...a, teacher_id: req.user!.id }).select().single();
    if (error) return res.status(400).json({ error: dbError(error) });
    return res.status(201).json({ data });
};

export const removeAvailability = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    if (!id) return;
    const { error } = await supabaseAdmin.from('teacher_availability').delete().eq('id', id).eq('teacher_id', req.user!.id);
    if (error) return res.status(400).json({ error: dbError(error) });
    return res.status(200).json({ message: 'Bloque eliminado' });
};

// ---------- Alumno: profesores, horarios y reservas ----------
export const listTeachers = async (_req: Request, res: Response) => {
    const { data } = await supabaseAdmin.from('teacher_availability').select('day_of_week, teacher:teacher_id(id, nombre, avatar_url, rol)').limit(2000);
    const map = new Map<string, { id: string; nombre: string; avatar_url: string | null; days: Set<number> }>();
    for (const r of data ?? []) {
        const t = r.teacher as unknown as { id: string; nombre: string; avatar_url: string | null; rol: string } | null;
        if (!t || t.rol !== 'profesor') continue;
        if (!map.has(t.id)) map.set(t.id, { id: t.id, nombre: t.nombre, avatar_url: t.avatar_url, days: new Set() });
        map.get(t.id)!.days.add(r.day_of_week as number);
    }
    return res.status(200).json({ data: [...map.values()].map((t) => ({ ...t, days: [...t.days].sort() })) });
};

export const slots = async (req: Request, res: Response) => {
    const teacherId = paramId(req, res);
    if (!teacherId) return;
    const date = String(req.query.date ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Fecha inválida' });

    const tz = env.APP_TIMEZONE;
    const now = Date.now();
    const dayStart = zonedToUtc(date, '00:00', tz);
    if (dayStart.getTime() > now + MAX_DAYS_AHEAD * 864e5) return res.status(400).json({ error: `Solo puedes reservar con hasta ${MAX_DAYS_AHEAD} días de anticipación` });

    const { data: av } = await supabaseAdmin.from('teacher_availability').select('start_time, end_time').eq('teacher_id', teacherId).eq('day_of_week', dowOfDate(date));
    const { data: booked } = await supabaseAdmin.from('tutoring_sessions').select('scheduled_at').eq('teacher_id', teacherId).eq('status', 'programada')
        .gte('scheduled_at', new Date(dayStart.getTime() - HOUR).toISOString()).lte('scheduled_at', new Date(dayStart.getTime() + 25 * HOUR).toISOString());
    const bookedMs = (booked ?? []).map((b) => new Date(b.scheduled_at as string).getTime());

    const out: string[] = [];
    for (const a of av ?? []) {
        const s = toMin(a.start_time as string), e = toMin(a.end_time as string);
        for (let t = s; t + SESSION_MIN <= e; t += SESSION_MIN) {
            const inst = zonedToUtc(date, `${pad(Math.floor(t / 60))}:${pad(t % 60)}`, tz).getTime();
            if (inst < now + HOUR) continue;                                            // mínimo 1 h de anticipación
            if (bookedMs.some((b) => Math.abs(b - inst) < SESSION_MIN * 60000)) continue; // ya ocupado
            out.push(new Date(inst).toISOString());
        }
    }
    return res.status(200).json({ data: out.sort() });
};

export const book = async (req: Request, res: Response) => {
    const parsed = z.strictObject({ teacher_id: z.uuid(), scheduled_at: z.iso.datetime() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: issueMessage(parsed.error) });
    const { teacher_id } = parsed.data;
    const start = new Date(parsed.data.scheduled_at);
    const ms = start.getTime();
    const now = Date.now();
    if (ms < now + HOUR) return res.status(400).json({ error: 'Reserva con al menos 1 hora de anticipación' });
    if (ms > now + MAX_DAYS_AHEAD * 864e5) return res.status(400).json({ error: `Máximo ${MAX_DAYS_AHEAD} días de anticipación` });

    const { data: teacher } = await supabaseAdmin.from('profiles').select('id, rol').eq('id', teacher_id).maybeSingle();
    if (!teacher || teacher.rol !== 'profesor') return res.status(404).json({ error: 'Profesor no encontrado' });

    // Debe caer dentro de un bloque de disponibilidad (en la zona horaria de la escuela)
    const dow = localDow(start, env.APP_TIMEZONE);
    const min = localMinutes(start, env.APP_TIMEZONE);
    const { data: av } = await supabaseAdmin.from('teacher_availability').select('start_time, end_time').eq('teacher_id', teacher_id).eq('day_of_week', dow);
    if (!(av ?? []).some((a) => min >= toMin(a.start_time as string) && min + SESSION_MIN <= toMin(a.end_time as string))) {
        return res.status(400).json({ error: 'Ese horario está fuera de la disponibilidad del profesor' });
    }

    const lo = new Date(ms - SESSION_MIN * 60000).toISOString();
    const hi = new Date(ms + SESSION_MIN * 60000).toISOString();
    const overlap = async (col: 'teacher_id' | 'student_id', id: string) =>
        ((await supabaseAdmin.from('tutoring_sessions').select('id', { count: 'exact', head: true }).eq(col, id).eq('status', 'programada').gt('scheduled_at', lo).lt('scheduled_at', hi)).count ?? 0) > 0;
    if (await overlap('teacher_id', teacher_id)) return res.status(409).json({ error: 'Ese horario ya fue reservado' });
    if (await overlap('student_id', req.user!.id)) return res.status(409).json({ error: 'Ya tienes una tutoría en ese horario' });

    const { data, error } = await supabaseAdmin.from('tutoring_sessions')
        .insert({ student_id: req.user!.id, teacher_id, scheduled_at: start.toISOString() }).select().single();
    if (error) return res.status(error.code === '23505' ? 409 : 400).json({ error: error.code === '23505' ? 'Ese horario ya fue reservado' : dbError(error) });
    return res.status(201).json({ data });
};

// ---------- Sesiones (cada rol ve las suyas) ----------
export const mine = async (req: Request, res: Response) => {
    const teacherSide = req.userRole === 'profesor' || req.userRole === 'admin';
    const q = teacherSide
        ? supabaseAdmin.from('tutoring_sessions').select('*, student:student_id(nombre)').eq('teacher_id', req.user!.id)
        : supabaseAdmin.from('tutoring_sessions').select('*, teacher:teacher_id(nombre)').eq('student_id', req.user!.id);
    const { data, error } = await q.order('scheduled_at', { ascending: false }).limit(100);
    if (error) return res.status(400).json({ error: dbError(error) });
    return res.status(200).json({ data });
};

export const updateSession = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    if (!id) return;
    const parsed = sessionUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: issueMessage(parsed.error) });

    const { data, error } = await supabaseAdmin.from('tutoring_sessions').update(parsed.data).eq('id', id).eq('teacher_id', req.user!.id).select().maybeSingle();
    if (error) return res.status(400).json({ error: dbError(error) });
    if (!data) return res.status(404).json({ error: 'Sesión no encontrada' });
    return res.status(200).json({ data });
};

export const cancelSession = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    if (!id) return;
    const { data: s } = await supabaseAdmin.from('tutoring_sessions').select('student_id, teacher_id, status').eq('id', id).maybeSingle();
    if (!s || (s.student_id !== req.user!.id && s.teacher_id !== req.user!.id)) return res.status(404).json({ error: 'Sesión no encontrada' });
    if (s.status !== 'programada') return res.status(400).json({ error: 'Solo se pueden cancelar sesiones programadas' });

    const { error } = await supabaseAdmin.from('tutoring_sessions').update({ status: 'cancelada' }).eq('id', id);
    if (error) return res.status(400).json({ error: dbError(error) });
    return res.status(200).json({ message: 'Sesión cancelada' });
};