// edtech-backend/src/modules/tutoring/tutoring.routes.ts
import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/roles';
import * as t from './tutorings.controllers';

export const tutoringRouter = Router();
tutoringRouter.use(requireAuth);

const teacher = requireRole(['profesor', 'admin']);
const student = requireRole(['alumno_adulto', 'alumno_menor']);
const anyParticipant = requireRole(['alumno_adulto', 'alumno_menor', 'profesor', 'admin']);

// Profesor: su disponibilidad y sus sesiones
tutoringRouter.get('/availability', teacher, t.listAvailability);
tutoringRouter.post('/availability', teacher, t.addAvailability);
tutoringRouter.delete('/availability/:id', teacher, t.removeAvailability);
tutoringRouter.patch('/sessions/:id', teacher, t.updateSession);

// Alumno: elegir profesor, ver horarios y reservar
tutoringRouter.get('/teachers', student, t.listTeachers);
tutoringRouter.get('/teachers/:id/slots', student, t.slots);
tutoringRouter.post('/book', student, t.book);

// Ambos
tutoringRouter.get('/mine', anyParticipant, t.mine);
tutoringRouter.post('/sessions/:id/cancel', anyParticipant, t.cancelSession);