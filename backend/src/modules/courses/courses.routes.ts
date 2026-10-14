// edtech-backend/src/modules/courses/courses.routes.ts
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/roles';
import * as m from './courses.manage.controller';
import * as c from './courses.content.controller';
import * as l from './courses.learning.controller';
import * as p from './courses.public.controller';

// ---------- Público (sin sesión) ----------
export const publicRouter = Router();
const verifyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Demasiadas consultas' } });
publicRouter.get('/courses', p.catalog);
publicRouter.get('/courses/:slug', p.courseDetail);
publicRouter.get('/certificates/:id', verifyLimiter, p.verifyCertificate);

// ---------- Gestión (admin + profesor dueño) ----------
export const manageRouter = Router();
manageRouter.use(requireAuth, requireRole(['admin', 'profesor']));
manageRouter.get('/options/subjects', m.subjectOptions);
manageRouter.get('/overview', m.teacherOverview);

manageRouter.get('/courses', m.listCourses);
manageRouter.post('/courses', m.createCourse);
manageRouter.get('/courses/:id', m.getCourse);
manageRouter.patch('/courses/:id', m.updateCourse);
manageRouter.delete('/courses/:id', m.deleteCourse);
manageRouter.get('/courses/:id/students', m.courseStudents);
manageRouter.post('/courses/:id/certificates', m.issueCertificate);

manageRouter.post('/courses/:id/modules', c.createModule);
manageRouter.patch('/modules/:id', c.updateModule);
manageRouter.delete('/modules/:id', c.deleteModule);
manageRouter.post('/modules/:id/move', c.moveModule);

manageRouter.post('/modules/:id/lessons', c.createLesson);
manageRouter.patch('/lessons/:id', c.updateLesson);
manageRouter.delete('/lessons/:id', c.deleteLesson);
manageRouter.post('/lessons/:id/move', c.moveLesson);

manageRouter.post('/lessons/:id/questions', c.createQuestion);
manageRouter.patch('/questions/:id', c.updateQuestion);
manageRouter.delete('/questions/:id', c.deleteQuestion);

manageRouter.get('/courses/:id/achievements', c.listCourseAchievements);
manageRouter.post('/courses/:id/achievements', c.createCourseAchievement);
manageRouter.patch('/achievements/:id', c.updateCourseAchievement);
manageRouter.delete('/achievements/:id', c.deleteCourseAchievement);

// ---------- Aprendizaje (alumnos) ----------
export const learningRouter = Router();
learningRouter.use(requireAuth, requireRole(['alumno_adulto', 'alumno_menor']));
learningRouter.get('/my-courses', l.myCourses);
learningRouter.post('/enroll/:id', l.enroll);
learningRouter.get('/courses/:slug', l.courseOutline);
learningRouter.get('/lessons/:id', l.getLesson);
learningRouter.post('/lessons/:id/complete', l.completeLesson);
learningRouter.post('/lessons/:id/quiz', l.submitQuiz);
learningRouter.get('/gamification', l.gamification);
learningRouter.get('/dashboard', l.dashboard);
learningRouter.get('/certificates', l.myCertificates);