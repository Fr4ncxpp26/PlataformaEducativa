import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../../middlewares/auth';
import {
    deleteNotification,
    getPreferences,
    listNotifications,
    markAllNotificationsRead,
    markNotificationRead,
    pushConfig,
    pushTest,
    subscribePush,
    unsubscribePush,
    updatePreferences,
} from './notifications.controller';

const router = Router();
const pushTestLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 3,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Alcanzaste el límite de pruebas push por ahora.', code: 'RATE_LIMITED' },
});

router.use(requireAuth);
router.get('/', listNotifications);
router.get('/preferences', getPreferences);
router.patch('/preferences', updatePreferences);
router.get('/push/config', pushConfig);
router.post('/push/subscriptions', subscribePush);
router.delete('/push/subscriptions', unsubscribePush);
router.post('/push/test', pushTestLimiter, pushTest);
router.post('/read-all', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);
router.delete('/:id', deleteNotification);

export default router;
