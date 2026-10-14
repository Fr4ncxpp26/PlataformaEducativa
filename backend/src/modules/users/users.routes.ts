import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../../middlewares/auth';
import { changePassword, deleteMe, exportData, getMyProfile, updateMe } from './users.controllers';
 
// Acciones sensibles: 5 intentos / 15 min por IP
const sensitiveLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false,
    message: { error: 'Demasiados intentos. Intenta más tarde.' },
});
 
const router = Router();
router.use(requireAuth);
router.get('/me', getMyProfile);
router.patch('/me', updateMe);
router.post('/me/password', sensitiveLimiter, changePassword);
router.get('/me/export', exportData);
router.delete('/me', sensitiveLimiter, deleteMe);
export default router;