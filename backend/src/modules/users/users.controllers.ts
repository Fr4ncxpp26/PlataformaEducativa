import { Request, Response } from 'express';
import { z } from 'zod';
import { createAnonClient, supabaseAdmin } from '../../config/supabase';
import { clearAuthCookies } from '../auth/auth.cookies';
import { password as passwordRule } from '../auth/auth.validations';
import { studentStats } from '../courses/courses.rewards';
import { PROFILE_FIELDS, getProfile } from './profile.service';
 
// strictObject: rechaza campos extra (nadie puede colar "rol", "puntos", etc.)
const updateSchema = z.strictObject({
    nombre: z.string().trim().min(2, 'El nombre es muy corto').max(100).optional(),
    avatar_url: z.url('URL de avatar inválida').refine((u) => u.startsWith('https://'), 'El avatar debe ser https').nullable().optional(),
    headline: z.string().trim().max(120, 'Titular: máximo 120 caracteres').nullable().optional(),
    bio: z.string().trim().max(500, 'Biografía: máximo 500 caracteres').nullable().optional(),
    telefono: z.string().trim().regex(/^[+\d\s()-]{7,25}$/, 'Teléfono inválido').nullable().optional(),
    pais: z.string().trim().max(60).nullable().optional(),
    ranking_visible: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'Nada que actualizar' });
 
const passwordSchema = z.strictObject({ current_password: z.string().min(1).max(72), new_password: passwordRule });
const deleteSchema = z.strictObject({ confirm: z.literal('ELIMINAR'), password: z.string().max(72).optional() });
 
const hasPassword = (req: Request) => {
    const meta = req.user!.app_metadata as { providers?: string[]; provider?: string };
    return (meta.providers ?? [meta.provider]).includes('email');
};
 
// Re-autenticación para acciones sensibles (la sesión creada para verificar se revoca al instante)
async function verifyPassword(email: string, password: string) {
    const { data, error } = await createAnonClient().auth.signInWithPassword({ email, password });
    if (error || !data.session) return false;
    await supabaseAdmin.auth.admin.signOut(data.session.access_token, 'local').catch(() => undefined);
    return true;
}
 
// Chips de resumen según el rol
async function summary(uid: string, rol: string) {
    const head = (table: string, col: string) =>
        supabaseAdmin.from(table).select('*', { count: 'exact', head: true }).eq(col, uid).then((r) => r.count ?? 0);
    if (rol === 'alumno_adulto' || rol === 'alumno_menor') {
        const [s, courses] = await Promise.all([studentStats(uid), head('enrollments', 'student_id')]);
        return [
            { label: 'Cursos', value: courses }, { label: 'Puntos', value: s.points },
            { label: 'Racha', value: `${s.streak} días` }, { label: 'Certificados', value: s.courses },
        ];
    }
    if (rol === 'profesor') {
        const { data } = await supabaseAdmin.from('courses').select('id, enrollments(count)').eq('teacher_id', uid);
        const students = (data ?? []).reduce((n, c) => n + ((c.enrollments as unknown as { count: number }[])?.[0]?.count ?? 0), 0);
        return [{ label: 'Cursos creados', value: data?.length ?? 0 }, { label: 'Alumnos', value: students }, { label: 'Tutorías dadas', value: await head('tutoring_sessions', 'teacher_id') }];
    }
    if (rol === 'padre_tutor') return [{ label: 'Alumnos vinculados', value: await head('guardian_student', 'guardian_id') }];
    return [];
}
 
// ---------- Perfil completo (datos + cuenta + resumen) ----------
export const getMyProfile = async (req: Request, res: Response) => {
    const profile = await getProfile(req.user!.id);
    if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' });
    const u = req.user!;
    return res.status(200).json({
        user: { ...profile, email: u.email },
        auth: { hasPassword: hasPassword(req), providers: (u.app_metadata as { providers?: string[] }).providers ?? [], created_at: u.created_at, last_sign_in_at: u.last_sign_in_at ?? null },
        summary: await summary(u.id, profile.rol as string),
    });
};
 
export const updateMe = async (req: Request, res: Response) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
 
    if (parsed.data.ranking_visible && req.userRole === 'alumno_menor') return res.status(400).json({ error: 'Los perfiles de menores de edad siempre son privados' });
    const { data, error } = await supabaseAdmin.from('profiles').update(parsed.data).eq('id', req.user!.id).select(PROFILE_FIELDS).single();
    if (error) return res.status(400).json({ error: 'No se pudo actualizar el perfil' });
    return res.status(200).json({ user: { ...data, email: req.user!.email } });
};
 
// ---------- Seguridad ----------
export const changePassword = async (req: Request, res: Response) => {
    if (!hasPassword(req)) return res.status(400).json({ error: 'Tu cuenta inicia sesión con Google. Administra tu contraseña desde tu cuenta de Google.' });
    const parsed = passwordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
    const { current_password, new_password } = parsed.data;
    if (current_password === new_password) return res.status(400).json({ error: 'La nueva contraseña debe ser distinta a la actual' });
 
    // 400 (no 401): un 401 haría que el cliente intente renovar la sesión
    if (!(await verifyPassword(req.user!.email!, current_password))) return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
 
    const { error } = await supabaseAdmin.auth.admin.updateUserById(req.user!.id, { password: new_password });
    if (error) return res.status(400).json({ error: 'No se pudo actualizar la contraseña' });
    await supabaseAdmin.auth.admin.signOut(req.accessToken!, 'others').catch(() => undefined); // cierra las demás sesiones
    return res.status(200).json({ message: 'Contraseña actualizada. Cerramos tu sesión en otros dispositivos.' });
};
 
// ---------- Privacidad: descarga de todos tus datos ----------
export const exportData = async (req: Request, res: Response) => {
    const uid = req.user!.id;
    const get = async (table: string, col: string, fields = '*') => (await supabaseAdmin.from(table).select(fields).eq(col, uid).limit(5000)).data ?? [];
    const [enrollments, progress, attempts, certificates, achievements, sessions, payments] = await Promise.all([
        get('enrollments', 'student_id'), get('progress', 'student_id'), get('quiz_attempts', 'student_id'), get('certificates', 'student_id'),
        get('student_achievements', 'student_id'), get('tutoring_sessions', 'student_id'), get('payments', 'student_id', 'id, course_id, amount, status, created_at'),
    ]);
    res.setHeader('Content-Disposition', 'attachment; filename="mis-datos.json"');
    return res.status(200).json({
        exported_at: new Date().toISOString(), profile: { ...(await getProfile(uid)), email: req.user!.email, created_at: req.user!.created_at },
        enrollments, progress, quiz_attempts: attempts, certificates, achievements, tutoring_sessions: sessions, payments,
    });
};
 
// ---------- Eliminar cuenta ----------
export const deleteMe = async (req: Request, res: Response) => {
    const parsed = deleteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Escribe ELIMINAR para confirmar' });
    if (req.userRole === 'admin') return res.status(403).json({ error: 'Un administrador no puede eliminarse a sí mismo' });
 
    if (hasPassword(req)) {
        if (!parsed.data.password) return res.status(400).json({ error: 'Ingresa tu contraseña para confirmar' });
        if (!(await verifyPassword(req.user!.email!, parsed.data.password))) return res.status(400).json({ error: 'Contraseña incorrecta' });
    }
    if (req.userRole === 'profesor') {
        const { count } = await supabaseAdmin.from('courses').select('*', { count: 'exact', head: true }).eq('teacher_id', req.user!.id).eq('is_published', true);
        if (count) return res.status(409).json({ error: 'Tienes cursos publicados. Despublícalos o pide a un administrador que los reasigne antes de eliminar tu cuenta.' });
    }
 
    const { error } = await supabaseAdmin.auth.admin.deleteUser(req.user!.id);
    if (error) return res.status(400).json({ error: 'No se pudo eliminar la cuenta' });
    clearAuthCookies(res);
    return res.status(200).json({ message: 'Cuenta eliminada' });
};