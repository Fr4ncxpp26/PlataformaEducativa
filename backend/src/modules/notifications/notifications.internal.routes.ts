import { Router, Request, Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env';
import { processTutoringReminders } from './notifications.service';

const router = Router();

const safeSecretMatch = (authorization: string | undefined) => {
    const expected = env.NOTIFICATIONS_CRON_SECRET;
    if (!expected || !authorization?.startsWith('Bearer ')) return false;

    const received = Buffer.from(authorization.slice(7));
    const configured = Buffer.from(expected);
    return received.length === configured.length && timingSafeEqual(received, configured);
};

router.post('/tutoring-reminders', async (req: Request, res: Response) => {
    if (!env.NOTIFICATIONS_CRON_SECRET) {
        return res.status(503).json({ error: 'El programador de recordatorios no está configurado.', code: 'CRON_NOT_CONFIGURED' });
    }
    if (!safeSecretMatch(req.get('authorization'))) {
        return res.status(401).json({ error: 'No autorizado.', code: 'UNAUTHORIZED' });
    }

    try {
        const result = await processTutoringReminders();
        return res.status(200).json({ ok: true, ...result });
    } catch {
        console.error('Falló el procesamiento de recordatorios de tutorías.');
        return res.status(500).json({ error: 'No se pudieron procesar los recordatorios.', code: 'REMINDERS_FAILED' });
    }
});

export default router;
