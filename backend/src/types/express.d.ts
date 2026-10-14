import { User } from '@supabase/supabase-js';

export type Rol = 'alumno_menor' | 'alumno_adulto' | 'padre_tutor' | 'profesor' | 'editor' | 'admin';

declare global {
    namespace Express {
        interface Request {
            user?: User;
            userRole?: Rol;
            accessToken?: string;
        }
    }
}