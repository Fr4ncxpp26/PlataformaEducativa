import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';
import { ACCESS_COOKIE } from '../modules/auth/auth.cookies';

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies?.[ACCESS_COOKIE];
        if (typeof token !== 'string' || token.length === 0) {
            return res.status(401).json({
                error: 'Inicia sesión para continuar.',
                code: 'UNAUTHENTICATED',
            });
        }

        // Verifica el token con Supabase; no se confía en datos enviados por el navegador.
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user) {
            return res.status(401).json({
                error: 'Tu sesión expiró o ya no es válida.',
                code: 'TOKEN_EXPIRED',
            });
        }

        if (data.user.banned_until && new Date(data.user.banned_until) > new Date()) {
            return res.status(403).json({
                error: 'Tu cuenta no está disponible. Contacta con soporte.',
                code: 'ACCOUNT_SUSPENDED',
            });
        }

        // El rol se consulta en la tabla de perfiles, nunca desde user_metadata.
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('rol')
            .eq('id', data.user.id)
            .maybeSingle();

        if (profileError) return next(profileError);

        if (!profile?.rol) {
            return res.status(403).json({
                error: 'No se pudo verificar tu perfil. Contacta con soporte.',
                code: 'PROFILE_UNAVAILABLE',
            });
        }

        req.user = data.user;
        req.userRole = profile.rol;
        req.accessToken = token;

        return next();
    } catch (error) {
        return next(error);
    }
};
