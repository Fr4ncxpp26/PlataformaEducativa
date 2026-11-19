import { createHash } from 'node:crypto';
import { supabaseAdmin } from '../../config/supabase';
import { sendWebPush } from './push.service';

export type NotificationCategory = 'tutoring' | 'academic' | 'courses' | 'account' | 'system';

export interface CreateNotificationInput {
    userId: string;
    category: NotificationCategory;
    title: string;
    message: string;
    href?: string | null;
    dedupeKey?: string | null;
}

interface NotificationPreferences {
    push_enabled: boolean;
    tutoring_enabled: boolean;
    academic_enabled: boolean;
    courses_enabled: boolean;
    account_enabled: boolean;
    system_enabled: boolean;
}

const categoryColumn: Record<NotificationCategory, keyof NotificationPreferences> = {
    tutoring: 'tutoring_enabled',
    academic: 'academic_enabled',
    courses: 'courses_enabled',
    account: 'account_enabled',
    system: 'system_enabled',
};

const safeHref = (href?: string | null) =>
    href && href.startsWith('/') && !href.startsWith('//') && !href.includes('\\')
        ? href.slice(0, 500)
        : null;

const loadPreferences = async (userId: string): Promise<NotificationPreferences | null> => {
    const { data, error } = await supabaseAdmin
        .from('notification_preferences')
        .select('push_enabled, tutoring_enabled, academic_enabled, courses_enabled, account_enabled, system_enabled')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        console.error('No se pudieron consultar las preferencias de notificaciones.', { code: error.code });
        return null;
    }
    return data as NotificationPreferences | null;
};

async function deliverGenericPush(userId: string, href: string | null) {
    const { data, error } = await supabaseAdmin
        .from('notification_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', userId)
        .limit(10);

    if (error || !data?.length) return;

    // No se envían nombres, calificaciones, datos del menor ni contenido privado a la pantalla bloqueada.
    const payload = JSON.stringify({
        title: 'Escuela Digital',
        body: 'Tienes una actualización nueva. Abre la plataforma para consultarla.',
        url: href ?? '/notificaciones',
    });

    await Promise.all(data.map(async (subscription) => {
        const result = await sendWebPush(subscription, payload);
        if (result === 'expired') {
            await supabaseAdmin.from('notification_subscriptions')
                .delete().eq('endpoint', subscription.endpoint).eq('user_id', userId);
        }
    }));
}

export async function createUserNotification(input: CreateNotificationInput) {
    const preferences = await loadPreferences(input.userId);
    if (preferences && preferences[categoryColumn[input.category]] === false) {
        return { created: false, skipped: 'PREFERENCE_DISABLED' as const };
    }

    const href = safeHref(input.href);
    const row = {
        user_id: input.userId,
        category: input.category,
        title: input.title.trim().slice(0, 120),
        message: input.message.trim().slice(0, 500),
        href,
        dedupe_key: input.dedupeKey ?? null,
    };

    const { data, error } = await supabaseAdmin
        .from('notifications')
        .insert(row)
        .select('id, user_id, category, title, message, href, read_at, created_at')
        .maybeSingle();

    if (error) {
        if (error.code === '23505' && input.dedupeKey) {
            return { created: false, skipped: 'DUPLICATE' as const };
        }
        console.error('No se pudo guardar una notificación.', { code: error.code });
        return { created: false, skipped: 'DATABASE_ERROR' as const };
    }

    if (preferences?.push_enabled) {
        await deliverGenericPush(input.userId, href);
    }

    return { created: Boolean(data), data };
}

export async function notifyTutoringBooked(studentId: string, teacherId: string) {
    await Promise.all([
        createUserNotification({
            userId: studentId,
            category: 'tutoring',
            title: 'Tutoría reservada',
            message: 'Tu tutoría quedó registrada correctamente.',
            href: '/tutorias',
        }),
        createUserNotification({
            userId: teacherId,
            category: 'tutoring',
            title: 'Nueva tutoría en tu agenda',
            message: 'Se registró una nueva tutoría en tu agenda.',
            href: '/profesor/tutorias',
        }),
    ]);
}

export async function notifyTutoringCancelled(
    recipientId: string,
    recipientRole: 'student' | 'teacher',
) {
    await createUserNotification({
        userId: recipientId,
        category: 'tutoring',
        title: 'Tutoría cancelada',
        message: 'Una tutoría que tenías programada fue cancelada.',
        href: recipientRole === 'teacher' ? '/profesor/tutorias' : '/tutorias',
    });
}

export async function notifyTutoringUpdated(studentId: string) {
    await createUserNotification({
        userId: studentId,
        category: 'tutoring',
        title: 'Tutoría actualizada',
        message: 'El profesor actualizó la información de una tutoría.',
        href: '/tutorias',
    });
}

export async function notifyPublishedCourse(
    courseId: string,
    title: string,
    slug: string,
    publishedAt: string,
) {
    const { data: studentIds, error } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .in('rol', ['alumno_adulto', 'alumno_menor'])
        .order('id')
        .limit(5000);

    if (error) {
        console.error('No se pudieron obtener destinatarios del nuevo curso.', { code: error.code });
        return;
    }

    const stamp = createHash('sha256').update(publishedAt).digest('hex').slice(0, 12);
    for (let offset = 0; offset < (studentIds ?? []).length; offset += 50) {
        const batch = (studentIds ?? []).slice(offset, offset + 50);
        await Promise.all(batch.map((student) => createUserNotification({
            userId: student.id as string,
            category: 'courses',
            title: 'Nuevo curso disponible',
            message: `Ya puedes explorar el curso «${title.slice(0, 160)}».`,
            href: `/cursos/${encodeURIComponent(slug)}`,
            dedupeKey: `course:${courseId}:published:${stamp}:user:${student.id}`,
        })));
    }
}

export async function notifyNewAchievements(
    studentId: string,
    achievements: { id: string; name: string }[],
) {
    if (!achievements.length) return;

    const names = achievements.slice(0, 4).map((item) => item.name).join(', ');
    const digest = createHash('sha256')
        .update(achievements.map((item) => item.id).sort().join(':'))
        .digest('hex')
        .slice(0, 16);

    await createUserNotification({
        userId: studentId,
        category: 'academic',
        title: achievements.length === 1 ? 'Nuevo logro desbloqueado' : 'Nuevos logros desbloqueados',
        message: achievements.length === 1
            ? `Has conseguido «${names}».`
            : `Has conseguido nuevos logros: ${names}.`,
        href: '/logros',
        dedupeKey: `achievements:${studentId}:${digest}`,
    });

    const { data: links, error } = await supabaseAdmin
        .from('guardian_student')
        .select('guardian_id')
        .eq('student_id', studentId);

    if (error) {
        console.error('No se pudieron localizar tutores para el aviso académico.', { code: error.code });
        return;
    }

    await Promise.all((links ?? []).map((link) => createUserNotification({
        userId: link.guardian_id as string,
        category: 'academic',
        title: 'Actualización académica',
        message: 'Un alumno a tu cargo consiguió un nuevo logro.',
        href: `/tutor/alumno/${studentId}`,
        dedupeKey: `guardian-achievement:${studentId}:${link.guardian_id}:${digest}`,
    })));
}

export async function processTutoringReminders() {
    const now = Date.now();
    // El cron debe ejecutarse cada 5 minutos. La ventana solapada y dedupe_key evitan pérdidas y duplicados.
    const from = new Date(now + 10 * 60 * 1000).toISOString();
    const to = new Date(now + 16 * 60 * 1000).toISOString();

    const { data: sessions, error } = await supabaseAdmin
        .from('tutoring_sessions')
        .select('id, student_id, teacher_id, scheduled_at')
        .eq('status', 'programada')
        .gte('scheduled_at', from)
        .lte('scheduled_at', to)
        .limit(500);

    if (error) throw new Error('TUTORING_REMINDERS_QUERY_FAILED');

    let created = 0;
    for (const session of sessions ?? []) {
        const stamp = `tutoring-reminder:${session.id}`;
        const results = await Promise.all([
            createUserNotification({
                userId: session.student_id as string,
                category: 'tutoring',
                title: 'Tu tutoría es próximamente',
                message: 'Tienes una tutoría programada dentro de aproximadamente 15 minutos.',
                href: '/tutorias',
                dedupeKey: `${stamp}:student`,
            }),
            createUserNotification({
                userId: session.teacher_id as string,
                category: 'tutoring',
                title: 'Tienes una tutoría próximamente',
                message: 'Tienes una tutoría programada dentro de aproximadamente 15 minutos.',
                href: '/profesor/tutorias',
                dedupeKey: `${stamp}:teacher`,
            }),
        ]);
        created += results.filter((result) => result.created).length;
    }

    return { sessions: sessions?.length ?? 0, notificationsCreated: created, window: { from, to } };
}
