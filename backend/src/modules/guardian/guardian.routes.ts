import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/roles';
import * as g from './guardian.controller';

// Panel del tutor (solo padre_tutor, solo sus alumnos vinculados)
export const guardianRouter = Router();
guardianRouter.use(requireAuth, requireRole(['padre_tutor']));
const redeemLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Demasiados intentos. Intenta más tarde.' } });
guardianRouter.post('/redeem', redeemLimiter, g.redeem);
guardianRouter.get('/students', g.listStudents);
guardianRouter.get('/students/:id', g.studentDetail);
guardianRouter.delete('/students/:id', g.unlinkStudent);

// Lado del alumno: ver/agregar/quitar tutor
export const tutorLinkRouter = Router();
tutorLinkRouter.use(requireAuth, requireRole(['alumno_adulto', 'alumno_menor']));
tutorLinkRouter.get('/', g.myTutors);
tutorLinkRouter.post('/invite', g.createInvite);
tutorLinkRouter.delete('/:id', g.removeTutor);