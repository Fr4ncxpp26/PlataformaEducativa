import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(4000),
    APP_TIMEZONE: z.string().default('America/Mexico_City'), // zona de agenda y rachas
    FRONTEND_URL: z.url(),   // ej. http://localhost:3000
    API_URL: z.url(),        // ej. http://localhost:4000 (URL pública de ESTE backend)
    SUPABASE_URL: z.url(),
    SUPABASE_ANON_KEY: z.string().min(20),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
});

// Si falta algo, el servidor NO arranca (falla rápido y claro)
export const env = schema.parse(process.env);