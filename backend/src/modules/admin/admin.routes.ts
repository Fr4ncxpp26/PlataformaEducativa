import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/roles';
import { registerResources } from './admin.resources';
import { stats, options } from './admin.stats.controller';
import {
    listUsers, createUser, updateUser, suspendUser, deleteUser, createGuardianship, deleteGuardianship,
} from './admin.users.controller';

const router = Router();

// TODO el panel exige sesión válida + rol admin (verificado contra la BD en cada petición)
router.use(requireAuth, requireRole(['admin']));

router.get('/stats', stats);
router.get('/options/:kind', options);

router.get('/users', listUsers);
router.post('/users', createUser);
router.patch('/users/:id', updateUser);
router.post('/users/:id/suspend', suspendUser);
router.delete('/users/:id', deleteUser);

router.post('/guardianships', createGuardianship);
router.delete('/guardianships', deleteGuardianship);

registerResources(router);

export default router;