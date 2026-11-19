import { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../config/supabase';
import { env } from '../../config/env';
import { isPushConfigured } from './push.service';
import { createUserNotification } from './notifications.service';

const preferencesSchema = z.strictObject({
    push_enabled: z.boolean().optional(),
    tutoring_enabled: z.boolean().optional(),
    academic_enabled: z.boolean().optional(),
    courses_enabled: z.boolean().optional(),
    account_enabled: z.boolean().optional(),
    system_enabled: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, 'Selecciona al menos una preferencia');

const subscriptionSchema = z.strictObject({
    endpoint: z.url().refine((value) => value.startsWith('https://'), 'Endpoint inválido').max(2000),
    keys: z.strictObject({
        p256dh: z.string().min(80).max(200),
        auth: z.string().min(16).max(100),
    }),
});

const endpointSchema = z.strictObject({ endpoint: z.string().url().max(2000) });

export const listNotifications = async (req: Request, res: Response) => {
    const limitValue = Number(req.query.limit);
    const limit = Number.isFinite(limitValue) ? Math.min(100, Math.max(1, Math.floor(limitValue))) : 30;

    const [rows, unread] = await Promise.all([
        supabaseAdmin.from('notifications')
            .select('id, category, title, message, href, read_at, created_at')
            .eq('user_id', req.user!.id)
            .order('created_at', { ascending: false })
            .limit(limit),
        supabaseAdmin.from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', req.user!.id)
            .is('read_at', null),
    ]);

    if (rows.error || unread.error) {
        console.error('No se pudieron cargar las notificaciones.', { code: rows.error?.code ?? unread.error?.code });
        return res.status(500).json({ error: 'No se pudieron cargar tus notificaciones.', code: 'NOTIFICATIONS_LOAD_FAILED' });
    }

    return res.status(200).json({
        data: rows.data ?? [],
        unreadCount: unread.count ?? 0,
    });
};

export const getPreferences = async (req: Request, res: Response) => {
    const { data, error } = await supabaseAdmin.from('notification_preferences')
        .select('user_id, push_enabled, tutoring_enabled, academic_enabled, courses_enabled, account_enabled, system_enabled')
        .eq('user_id', req.user!.id)
        .maybeSingle();

    if (error) return res.status(500).json({ error: 'No se pudieron cargar las preferencias.', code: 'PREFERENCES_LOAD_FAILED' });

    return res.status(200).json({
        data: data ?? {
            user_id: req.user!.id,
            push_enabled: false,
            tutoring_enabled: true,
            academic_enabled: true,
            courses_enabled: true,
            account_enabled: true,
            system_enabled: true,
        },
        pushAvailable: isPushConfigured(),
    });
};

export const updatePreferences = async (req: Request, res: Response) => {
    const parsed = preferencesSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Preferencias inválidas.', code: 'VALIDATION_ERROR' });

    if (parsed.data.push_enabled === true && !isPushConfigured()) {
        return res.status(503).json({ error: 'Las notificaciones push aún no están configuradas en el servidor.', code: 'PUSH_NOT_CONFIGURED' });
    }

    const { data, error } = await supabaseAdmin.from('notification_preferences')
        .upsert({ user_id: req.user!.id, ...parsed.data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
        .select('user_id, push_enabled, tutoring_enabled, academic_enabled, courses_enabled, account_enabled, system_enabled')
        .single();

    if (error) return res.status(500).json({ error: 'No se pudieron guardar tus preferencias.', code: 'PREFERENCES_SAVE_FAILED' });
    return res.status(200).json({ data });
};

export const pushConfig = async (_req: Request, res: Response) => {
    return res.status(200).json({
        available: isPushConfigured(),
        publicKey: isPushConfigured() ? env.VAPID_PUBLIC_KEY : null,
    });
};

export const subscribePush = async (req: Request, res: Response) => {
    if (!isPushConfigured()) {
        return res.status(503).json({ error: 'Las notificaciones push aún no están configuradas.', code: 'PUSH_NOT_CONFIGURED' });
    }

    const parsed = subscriptionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Suscripción push inválida.', code: 'INVALID_SUBSCRIPTION' });

    const { endpoint, keys } = parsed.data;
    const { data: existing, error: existingError } = await supabaseAdmin
        .from('notification_subscriptions')
        .select('user_id')
        .eq('endpoint', endpoint)
        .maybeSingle();

    if (existingError) return res.status(500).json({ error: 'No se pudo validar el dispositivo.', code: 'SUBSCRIPTION_CHECK_FAILED' });
    if (existing && existing.user_id !== req.user!.id) {
        return res.status(409).json({ error: 'Este dispositivo ya está asociado a otra cuenta.', code: 'SUBSCRIPTION_IN_USE' });
    }

    const { count, error: countError } = await supabaseAdmin.from('notification_subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', req.user!.id);

    if (countError) return res.status(500).json({ error: 'No se pudo validar el límite de dispositivos.', code: 'SUBSCRIPTION_CHECK_FAILED' });
    if (!existing && (count ?? 0) >= 10) {
        return res.status(409).json({ error: 'Alcanzaste el límite de 10 dispositivos registrados.', code: 'SUBSCRIPTION_LIMIT' });
    }

    const subscriptionData = {
        user_id: req.user!.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: req.get('user-agent')?.slice(0, 500) ?? null,
        updated_at: new Date().toISOString(),
    };

    // No usar upsert por endpoint: una carrera entre dos cuentas no debe reasignar
    // silenciosamente el endpoint que pertenece a otro usuario.
    const write = existing
        ? supabaseAdmin.from('notification_subscriptions').update(subscriptionData)
            .eq('endpoint', endpoint).eq('user_id', req.user!.id)
        : supabaseAdmin.from('notification_subscriptions').insert(subscriptionData);
    const { error } = await write;

    if (error) return res.status(500).json({ error: 'No se pudo registrar este dispositivo.', code: 'SUBSCRIPTION_SAVE_FAILED' });

    const { error: preferencesError } = await supabaseAdmin.from('notification_preferences')
        .upsert({ user_id: req.user!.id, push_enabled: true }, { onConflict: 'user_id' });

    if (preferencesError) {
        await supabaseAdmin.from('notification_subscriptions').delete()
            .eq('user_id', req.user!.id).eq('endpoint', endpoint);
        return res.status(500).json({ error: 'No se pudo activar la preferencia push.', code: 'PREFERENCES_SAVE_FAILED' });
    }

    return res.status(201).json({ message: 'Este dispositivo recibirá notificaciones push.' });
};

export const unsubscribePush = async (req: Request, res: Response) => {
    const parsed = endpointSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Endpoint inválido.', code: 'INVALID_ENDPOINT' });

    const { error } = await supabaseAdmin.from('notification_subscriptions')
        .delete().eq('user_id', req.user!.id).eq('endpoint', parsed.data.endpoint);

    if (error) return res.status(500).json({ error: 'No se pudo desactivar este dispositivo.', code: 'UNSUBSCRIBE_FAILED' });

    const { count, error: countError } = await supabaseAdmin.from('notification_subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', req.user!.id);

    if (!countError && (count ?? 0) === 0) {
        await supabaseAdmin.from('notification_preferences')
            .upsert({ user_id: req.user!.id, push_enabled: false, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    }

    return res.status(200).json({ message: 'Este dispositivo dejó de recibir notificaciones push.' });
};

export const pushTest = async (req: Request, res: Response) => {
    if (!isPushConfigured()) return res.status(503).json({ error: 'Push no configurado.', code: 'PUSH_NOT_CONFIGURED' });

    const { data: pref } = await supabaseAdmin.from('notification_preferences')
        .select('push_enabled').eq('user_id', req.user!.id).maybeSingle();
    const { count } = await supabaseAdmin.from('notification_subscriptions')
        .select('id', { count: 'exact', head: true }).eq('user_id', req.user!.id);

    if (!pref?.push_enabled || !count) {
        return res.status(409).json({ error: 'Activa las notificaciones push en este dispositivo primero.', code: 'PUSH_NOT_ENABLED' });
    }

    await createUserNotification({
        userId: req.user!.id,
        category: 'system',
        title: 'Prueba de notificaciones',
        message: 'Las notificaciones están configuradas correctamente.',
        href: '/notificaciones',
    });

    return res.status(200).json({ message: 'Se generó una notificación de prueba.' });
};

export const markNotificationRead = async (req: Request, res: Response) => {
    const id = String(req.params.id);
    if (!z.uuid().safeParse(id).success) return res.status(400).json({ error: 'Notificación inválida.', code: 'INVALID_ID' });

    const { data, error } = await supabaseAdmin.from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id).eq('user_id', req.user!.id)
        .select('id')
        .maybeSingle();

    if (error) return res.status(500).json({ error: 'No se pudo actualizar la notificación.', code: 'NOTIFICATION_UPDATE_FAILED' });
    if (!data) return res.status(404).json({ error: 'Notificación no encontrada.', code: 'NOTIFICATION_NOT_FOUND' });
    return res.status(200).json({ message: 'Notificación marcada como leída.' });
};

export const markAllNotificationsRead = async (req: Request, res: Response) => {
    const { error } = await supabaseAdmin.from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', req.user!.id)
        .is('read_at', null);

    if (error) return res.status(500).json({ error: 'No se pudieron actualizar las notificaciones.', code: 'NOTIFICATIONS_UPDATE_FAILED' });
    return res.status(200).json({ message: 'Notificaciones marcadas como leídas.' });
};

export const deleteNotification = async (req: Request, res: Response) => {
    const id = String(req.params.id);
    if (!z.uuid().safeParse(id).success) return res.status(400).json({ error: 'Notificación inválida.', code: 'INVALID_ID' });

    const { error } = await supabaseAdmin.from('notifications')
        .delete().eq('id', id).eq('user_id', req.user!.id);

    if (error) return res.status(500).json({ error: 'No se pudo eliminar la notificación.', code: 'NOTIFICATION_DELETE_FAILED' });
    return res.status(200).json({ message: 'Notificación eliminada.' });
};
