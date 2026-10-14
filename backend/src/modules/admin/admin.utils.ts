import { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../config/supabase';

export const issueMessage = (e: z.ZodError) => {
    const i = e.issues[0];
    if (!i) return 'Datos inválidos';
    const path = i.path.join('.');
    return path ? `${path}: ${i.message}` : i.message;
};

// No filtramos el mensaje interno de Postgres al cliente
export const dbError = (e: { code?: string }) =>
    e.code === '23505' ? 'Ya existe un registro igual (duplicado)'
        : e.code === '23503' ? 'Referencia inválida o el registro tiene dependencias'
            : e.code === '22P02' ? 'Formato de dato inválido'
                : 'No se pudo completar la operación';

// Evita inyección en filtros .or() de PostgREST
export const sanitizeTerm = (s: string) => s.replace(/[^\p{L}\p{N}\s@._-]/gu, '').slice(0, 60);

export const paramId = (req: Request, res: Response): string | null => {
    const id = String(req.params.id);
    if (!z.uuid().safeParse(id).success) {
        res.status(400).json({ error: 'ID inválido' });
        return null;
    }
    return id;
};

// Registro de auditoría: cada acción del admin queda guardada
export const logAudit = async (req: Request, action: string, entity: string, entityId?: string | null, details?: unknown) => {
    const { error } = await supabaseAdmin.from('audit_logs').insert({
        admin_id: req.user!.id,
        action,
        entity,
        entity_id: entityId ?? null,
        details: details ?? null,
        ip: req.ip ?? null,
    });
    if (error) console.error('audit_logs:', error.message);
};