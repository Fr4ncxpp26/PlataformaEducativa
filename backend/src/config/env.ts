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
    // Opcional mientras Stripe no esté habilitado en las rutas de la aplicación.
    STRIPE_SECRET_KEY: optionalSecret,
});

// El servidor no arranca si faltan credenciales obligatorias o las URLs son inválidas.
export const env = schema.parse(process.env);
