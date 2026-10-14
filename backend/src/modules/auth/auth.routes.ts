import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/roles';
import {
    register, registerMinor, login, logout, refresh, me, googleStart, googleCallback,
} from './auth.controller';

// Anti fuerza bruta: 10 intentos fallidos / 15 min por IP
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { error: 'Demasiados intentos. Intenta más tarde.' },
});

const router = Router();
router.post('/register', authLimiter, register);
router.post('/register-minor', requireAuth, requireRole(['padre_tutor']), registerMinor);
router.post('/login', authLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.get('/google', authLimiter, googleStart);
router.get('/google/callback', googleCallback);

export default router;