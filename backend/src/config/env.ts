import 'dotenv/config';
import { z } from 'zod';

const optionalSecret = z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().min(20).optional(),
);

const schema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    APP_TIMEZONE: z.string().min(1).default('America/Mexico_City'),
    FRONTEND_URL: z.url(),
    API_URL: z.url(),
    SUPABASE_URL: z.url(),
    SUPABASE_ANON_KEY: z.string().min(20),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
    CLOUDINARY_CLOUD_NAME: z.string().min(1),
    CLOUDINARY_API_KEY: z.string().min(1),
    CLOUDINARY_API_SECRET: z.string().min(1),
    VAPID_PUBLIC_KEY: z.string().regex(/^[A-Za-z0-9_-]{87}$/).optional(),
    VAPID_PRIVATE_KEY: z.string().regex(/^[A-Za-z0-9_-]{43}$/).optional(),
    VAPID_SUBJECT: z.string().refine((value) => value.startsWith('mailto:') || value.startsWith('https://')).default('mailto:soporte@example.com'),
    NOTIFICATIONS_CRON_SECRET: z.string().min(32).optional(),
    // Opcional mientras Stripe no esté habilitado en las rutas de la aplicación.
    //STRIPE_SECRET_KEY: optionalSecret,
}).superRefine((value, ctx) => {
    if (Boolean(value.VAPID_PUBLIC_KEY) !== Boolean(value.VAPID_PRIVATE_KEY)) {
        ctx.addIssue({
            code: 'custom',
            path: ['VAPID_PRIVATE_KEY'],
            message: 'VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY deben configurarse juntas.',
        });
    }
});

// El servidor no arranca si faltan credenciales obligatorias o las URLs son inválidas.
export const env = schema.parse(process.env);
