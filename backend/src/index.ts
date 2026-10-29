import { env } from './config/env'; // debe ir primero: carga y valida .env
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import authRoutes from './modules/auth/auth.routes';
import { publicRouter, manageRouter, learningRouter } from './modules/courses/courses.routes';
import { guardianRouter, tutorLinkRouter } from './modules/guardian/guardian.routes';
import { tutoringRouter } from './modules/tutorings/tutorings.routes';
import communityRoutes from './modules/community/community.routes';
import usersRoutes from './modules/users/users.routes';
import adminRoutes from './modules/admin/admin.routes';
import uploadsRoutes from './modules/uploads/uploads.routes';
import { errorHandler } from './middlewares/errorHandler';

const app: Application = express();

if (env.NODE_ENV === 'production') app.set('trust proxy', 1); // detrás de Render/Vercel/Nginx: IP real para el rate limit

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Demasiadas peticiones, intenta más tarde.' },
}));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser()); // SIN esto req.cookies es undefined y requireAuth truena

app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'Online', message: 'Escuela Digital API funcionando 🚀' });
});

app.use('/api/auth', authRoutes);
app.use('/api/public', publicRouter);
app.use('/api/manage', manageRouter);
app.use('/api/learning', learningRouter);
app.use('/api/guardian', guardianRouter);
app.use('/api/tutor-links', tutorLinkRouter);
app.use('/api/tutoring', tutoringRouter);
app.use('/api/community', communityRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/uploads', uploadsRoutes);

app.use(errorHandler);

app.listen(env.PORT, () => console.log(`🚀 Backend en http://localhost:${env.PORT}`));