// edtech-backend/src/modules/community/community.routes.ts
import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/roles';
import { leaderboard, publicProfile } from './community.controller';

// Los menores de edad no navegan perfiles ni rankings
const router = Router();
router.use(requireAuth, requireRole(['alumno_adulto', 'profesor', 'padre_tutor', 'editor', 'admin']));
router.get('/leaderboard', leaderboard);
router.get('/users/:id', publicProfile);
export default router;