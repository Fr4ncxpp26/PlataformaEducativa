import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';
import { ACCESS_COOKIE } from '../modules/auth/auth.cookies';

// El cliente, al recibir code TOKEN_EXPIRED, llama POST /api/auth/refresh y reintenta
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.[ACCESS_COOKIE];
    if (!token) return res.status(401).json({ error: 'No autenticado', code: 'TOKEN_EXPIRED' });

    const { data, error } = await supabase.auth.getUser(token); // valida firma/expiración contra Supabase
    if (error || !data.user) return res.status(401).json({ error: 'Sesión inválida o expirada', code: 'TOKEN_EXPIRED' });

    if (data.user.banned_until && new Date(data.user.banned_until) > new Date()) {
        return res.status(403).json({ error: 'Cuenta suspendida' });
    }

    // Rol desde BD (service role: no depende de RLS ni de metadata manipulable por el usuario)
    const { data: profile } = await supabaseAdmin.from('profiles').select('rol').eq('id', data.user.id).single();
    if (!profile) return res.status(403).json({ error: 'Perfil no encontrado' });

    req.user = data.user;
    req.userRole = profile.rol;
    req.accessToken = token;
    next();
};