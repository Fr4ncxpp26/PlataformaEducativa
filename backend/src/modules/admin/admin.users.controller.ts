import { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../config/supabase';
import { dbError, issueMessage, logAudit, paramId, sanitizeTerm } from './admin.utils';

const ROLES = ['alumno_menor', 'alumno_adulto', 'padre_tutor', 'profesor', 'editor', 'admin'] as const;
const rolEnum = z.enum(ROLES);

const createSchema = z.strictObject({
    email: z.string().trim().toLowerCase().pipe(z.email('Correo inválido')),
    password: z.string().min(8, 'Mínimo 8 caracteres').max(72),
    nombre: z.string().trim().min(2).max(100),
    rol: rolEnum,
});

const updateSchema = z.strictObject({
    nombre: z.string().trim().min(2).max(100).optional(),
    rol: rolEnum.optional(),
    avatar_url: z.url().refine((u) => u.startsWith('https://'), 'Debe ser https').nullable().optional(),
}).refine((d) => Object.keys(d).length > 0, 'Nada que actualizar');

// ---------- Usuarios ----------
export const listUsers = async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 15));

    let q = supabaseAdmin.from('profiles')
        .select('id, nombre, avatar_url, rol, puntos_totales, racha_actual', { count: 'exact' });
    const term = typeof req.query.q === 'string' ? sanitizeTerm(req.query.q) : '';
    if (term) q = q.ilike('nombre', `%${term}%`);
    if (typeof req.query.rol === 'string' && rolEnum.safeParse(req.query.rol).success) q = q.eq('rol', req.query.rol);

    const { data, error, count } = await q.order('nombre').range((page - 1) * pageSize, page * pageSize - 1);
    if (error) {
        console.error(error);
        return res.status(400).json({ error: dbError(error) });
    }

    // Email, último acceso y suspensión viven en auth.users
    const rows = await Promise.all((data ?? []).map(async (p) => {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(p.id);
        const banned = u.user?.banned_until ? new Date(u.user.banned_until) > new Date() : false;
        return { ...p, email: u.user?.email ?? null, last_sign_in_at: u.user?.last_sign_in_at ?? null, banned };
    }));

    return res.status(200).json({ data: rows, total: count ?? 0, page, pageSize });
};

export const createUser = async (req: Request, res: Response) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: issueMessage(parsed.error) });
    const { email, password, nombre, rol } = parsed.data;

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { nombre },
    });
    if (error || !data.user) return res.status(400).json({ error: error?.message ?? 'No se pudo crear el usuario' });

    // El trigger crea el perfil como alumno_adulto; aquí el admin asigna el rol real
    const { error: roleError } = await supabaseAdmin.from('profiles').update({ rol, nombre }).eq('id', data.user.id);
    if (roleError) {
        await supabaseAdmin.auth.admin.deleteUser(data.user.id); // rollback
        return res.status(500).json({ error: 'No se pudo asignar el rol' });
    }

    await logAudit(req, 'crear', 'users', data.user.id, { email, nombre, rol });
    return res.status(201).json({ data: { id: data.user.id } });
};

export const updateUser = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    if (!id) return;
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: issueMessage(parsed.error) });
    if (id === req.user!.id && parsed.data.rol && parsed.data.rol !== req.userRole) {
        return res.status(400).json({ error: 'No puedes cambiar tu propio rol' });
    }

    const { data, error } = await supabaseAdmin.from('profiles').update(parsed.data).eq('id', id).select().single();
    if (error) {
        if (error.code === 'PGRST116') return res.status(404).json({ error: 'Usuario no encontrado' });
        return res.status(400).json({ error: dbError(error) });
    }
    await logAudit(req, 'editar', 'users', id, parsed.data);
    return res.status(200).json({ data });
};

export const suspendUser = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    if (!id) return;
    if (id === req.user!.id) return res.status(400).json({ error: 'No puedes suspenderte a ti mismo' });
    const parsed = z.strictObject({ suspend: z.boolean() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' });

    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
        ban_duration: parsed.data.suspend ? '876000h' : 'none', // ~100 años / quitar suspensión
    });
    if (error) return res.status(400).json({ error: 'No se pudo cambiar el estado' });

    await logAudit(req, parsed.data.suspend ? 'suspender' : 'reactivar', 'users', id);
    return res.status(200).json({ message: 'Estado actualizado' });
};

export const deleteUser = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    if (!id) return;
    if (id === req.user!.id) return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta desde aquí' });

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) return res.status(400).json({ error: 'No se pudo eliminar el usuario' });

    await logAudit(req, 'eliminar', 'users', id);
    return res.status(200).json({ message: 'Usuario eliminado' });
};

// ---------- Vinculación padre/tutor ↔ menor ----------
export const createGuardianship = async (req: Request, res: Response) => {
    const parsed = z.strictObject({ guardian_id: z.uuid(), student_id: z.uuid() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: issueMessage(parsed.error) });
    const { guardian_id, student_id } = parsed.data;

    const { data: profs } = await supabaseAdmin.from('profiles').select('id, rol').in('id', [guardian_id, student_id]);
    if (profs?.find((p) => p.id === guardian_id)?.rol !== 'padre_tutor') {
        return res.status(400).json({ error: 'El tutor debe tener rol Padre / Tutor' });
    }
    if (profs?.find((p) => p.id === student_id)?.rol !== 'alumno_menor') {
        return res.status(400).json({ error: 'El alumno vinculado debe ser menor de edad' });
    }

    const { error } = await supabaseAdmin.from('guardian_student').insert({ guardian_id, student_id });
    if (error) return res.status(400).json({ error: dbError(error) });

    await logAudit(req, 'crear', 'guardianships', `${guardian_id}:${student_id}`);
    return res.status(201).json({ message: 'Vinculación creada' });
};

export const deleteGuardianship = async (req: Request, res: Response) => {
    const parsed = z.object({ guardian_id: z.uuid(), student_id: z.uuid() }).safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: 'Parámetros inválidos' });

    const { error } = await supabaseAdmin.from('guardian_student').delete()
        .eq('guardian_id', parsed.data.guardian_id).eq('student_id', parsed.data.student_id);
    if (error) return res.status(400).json({ error: dbError(error) });

    await logAudit(req, 'eliminar', 'guardianships', `${parsed.data.guardian_id}:${parsed.data.student_id}`);
    return res.status(200).json({ message: 'Vinculación eliminada' });
};