import { randomInt } from 'crypto';
import { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../config/supabase';
import { dbError, paramId } from '../admin/admin.utils';
import { studentStats } from '../courses/courses.rewards';
import { studentCourses, weekActivity } from '../courses/courses.progress';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I para evitar confusiones
const makeCode = () => Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

// ================= LADO ALUMNO: /api/tutor-links =================
export const myTutors = async (req: Request, res: Response) => {
    const { data, error } = await supabaseAdmin.from('guardian_student')
        .select('guardian:guardian_id(id, nombre, avatar_url)').eq('student_id', req.user!.id);
    if (error) return res.status(400).json({ error: dbError(error) });
    return res.status(200).json({ data: (data ?? []).map((r) => r.guardian) });
};

// Genera un código de un solo uso (7 días). El tutor lo canjea en su panel.
export const createInvite = async (req: Request, res: Response) => {
    const uid = req.user!.id;
    await supabaseAdmin.from('guardian_invites').delete().eq('student_id', uid).is('used_at', null); // solo un código vigente
    const expires_at = new Date(Date.now() + 7 * 864e5).toISOString();
    for (let i = 0; i < 3; i++) {
        const code = makeCode();
        const { error } = await supabaseAdmin.from('guardian_invites').insert({ code, student_id: uid, expires_at });
        if (!error) return res.status(201).json({ code, expires_at });
        if (error.code !== '23505') return res.status(400).json({ error: dbError(error) });
    }
    return res.status(500).json({ error: 'No se pudo generar el código' });
};

export const removeTutor = async (req: Request, res: Response) => {
    if (req.userRole === 'alumno_menor') return res.status(403).json({ error: 'Pide a tu tutor o a un administrador que cambie la vinculación' });
    const guardianId = paramId(req, res);
    if (!guardianId) return;
    const { error } = await supabaseAdmin.from('guardian_student').delete().eq('guardian_id', guardianId).eq('student_id', req.user!.id);
    if (error) return res.status(400).json({ error: dbError(error) });
    return res.status(200).json({ message: 'Tutor desvinculado' });
};

// ================= LADO TUTOR: /api/guardian =================
const assertLinked = async (req: Request, res: Response, studentId: string) => {
    const { data } = await supabaseAdmin.from('guardian_student').select('student_id')
        .eq('guardian_id', req.user!.id).eq('student_id', studentId).maybeSingle();
    if (!data) { res.status(403).json({ error: 'Este alumno no está vinculado a tu cuenta' }); return false; }
    return true;
};

export const redeem = async (req: Request, res: Response) => {
    const parsed = z.strictObject({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{8}$/, 'Código inválido') }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Código inválido' });

    const now = new Date().toISOString();
    // Canje atómico: solo un tutor puede usar el código
    const { data: inv } = await supabaseAdmin.from('guardian_invites').update({ used_at: now })
        .eq('code', parsed.data.code).is('used_at', null).gt('expires_at', now).select('student_id').maybeSingle();
    if (!inv) return res.status(400).json({ error: 'Código inválido o vencido' });

    const { error } = await supabaseAdmin.from('guardian_student').insert({ guardian_id: req.user!.id, student_id: inv.student_id });
    if (error && error.code !== '23505') return res.status(400).json({ error: dbError(error) });
    const { data: s } = await supabaseAdmin.from('profiles').select('nombre').eq('id', inv.student_id).single();
    return res.status(200).json({ message: `Ahora puedes ver el avance de ${s?.nombre ?? 'tu alumno'}`, student_id: inv.student_id });
};

export const listStudents = async (req: Request, res: Response) => {
    const { data } = await supabaseAdmin.from('guardian_student')
        .select('student:student_id(id, nombre, avatar_url, rol)').eq('guardian_id', req.user!.id);
    const students = (data ?? []).map((r) => r.student as unknown as { id: string; nombre: string; avatar_url: string | null; rol: string });

    const rows = await Promise.all(students.map(async (s) => {
        const [stats, courses] = await Promise.all([studentStats(s.id), studentCourses(s.id)]);
        const avg = courses.length ? Math.round(courses.reduce((n, c) => n + c.percent, 0) / courses.length) : 0;
        return { ...s, points: stats.points, streak: stats.streak, courses: courses.length, avgPercent: avg };
    }));
    return res.status(200).json({ data: rows });
};

export const studentDetail = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    if (!id || !(await assertLinked(req, res, id))) return;

    const { data: profile } = await supabaseAdmin.from('profiles').select('id, nombre, avatar_url, rol').eq('id', id).single();
    const [stats, week, courses] = await Promise.all([studentStats(id), weekActivity(id), studentCourses(id)]);
    const { data: attempts } = await supabaseAdmin.from('quiz_attempts')
        .select('score, passed, attempt_number, created_at, lesson:lesson_id(title, type, module:module_id(course:course_id(title)))')
        .eq('student_id', id).order('created_at', { ascending: false }).limit(30);
    const { data: prog } = await supabaseAdmin.from('progress').select('time_spent_seconds').eq('student_id', id).limit(5000);
    const { data: ach } = await supabaseAdmin.from('student_achievements').select('awarded_at, achievement:achievement_id(name)')
        .eq('student_id', id).order('awarded_at', { ascending: false }).limit(12);

    return res.status(200).json({
        profile, stats, week, courses,
        studyMinutes: Math.round((prog ?? []).reduce((n, p) => n + Number(p.time_spent_seconds ?? 0), 0) / 60),
        attempts: (attempts ?? []).map((a) => {
            const l = a.lesson as unknown as { title: string; type: string; module: { course: { title: string } } } | null;
            return { score: a.score, passed: a.passed, attempt: a.attempt_number, created_at: a.created_at, lesson: l?.title ?? '—', type: l?.type ?? '', course: l?.module?.course?.title ?? '—' };
        }),
        badges: (ach ?? []).map((a) => ({ awarded_at: a.awarded_at, name: (a.achievement as unknown as { name: string }).name })),
    });
};

export const unlinkStudent = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    if (!id) return;
    const { error } = await supabaseAdmin.from('guardian_student').delete().eq('guardian_id', req.user!.id).eq('student_id', id);
    if (error) return res.status(400).json({ error: dbError(error) });
    return res.status(200).json({ message: 'Alumno desvinculado' });
};