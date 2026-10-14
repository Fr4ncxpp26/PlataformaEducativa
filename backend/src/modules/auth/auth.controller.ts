import { Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../../config/env';
import { createAnonClient, createPkceClient, supabaseAdmin, PKCE_KEY } from '../../config/supabase';
import { loginSchema, registerMinorSchema, registerSchema } from './auth.validations';
import {
    REFRESH_COOKIE, ACCESS_COOKIE, PKCE_COOKIE,
    clearAuthCookies, clearPkceCookie, setAuthCookies, setPkceCookie,
} from './auth.cookies';
import { getProfile } from '../users/profile.service';
 
const fieldErrors = (e: z.ZodError) => z.flattenError(e).fieldErrors;
 
// ---------- REGISTRO ----------
export const register = async (req: Request, res: Response) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: fieldErrors(parsed.error) });
    const { email, password, nombre, rol } = parsed.data;
 
    // El trigger handle_new_user crea el perfil (y fuerza rol seguro)
    const { error } = await createAnonClient().auth.signUp({
        email, password,
        options: { data: { nombre, rol }, emailRedirectTo: `${env.FRONTEND_URL}/login` },
    });
    if (error) return res.status(400).json({ error: error.message });
 
    // Respuesta genérica: no revela si el correo ya existía
    return res.status(201).json({ message: 'Registro exitoso. Revisa tu correo para confirmar tu cuenta.' });
};
 
// Solo padre_tutor: crea cuenta de menor ya vinculada (guardian_student)
export const registerMinor = async (req: Request, res: Response) => {
    const parsed = registerMinorSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: fieldErrors(parsed.error) });
    const { email, password, nombre } = parsed.data;
 
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { nombre, rol: 'alumno_menor' },
    });
    if (error || !data.user) return res.status(400).json({ error: error?.message ?? 'No se pudo crear la cuenta' });
 
    const { error: linkError } = await supabaseAdmin
        .from('guardian_student').insert({ guardian_id: req.user!.id, student_id: data.user.id });
    if (linkError) {
        await supabaseAdmin.auth.admin.deleteUser(data.user.id); // rollback
        return res.status(500).json({ error: 'No se pudo vincular al menor' });
    }
    return res.status(201).json({ message: 'Cuenta del menor creada', student_id: data.user.id });
};
 
// ---------- LOGIN ----------
export const login = async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' });
 
    const { data, error } = await createAnonClient().auth.signInWithPassword(parsed.data);
    if (error || !data.session) {
        if (error?.code === 'email_not_confirmed') {
            return res.status(403).json({ error: 'Confirma tu correo antes de iniciar sesión' });
        }
        return res.status(401).json({ error: 'Credenciales inválidas' });
    }
 
    setAuthCookies(res, data.session);
    const profile = await getProfile(data.user.id);
    return res.status(200).json({ user: { id: data.user.id, email: data.user.email, ...profile } });
};
 
// ---------- GOOGLE (OAuth + PKCE) ----------
// Navegador: GET /api/auth/google  ->  Google  ->  GET /api/auth/google/callback  ->  FRONTEND/dashboard
export const googleStart = async (_req: Request, res: Response) => {
    const store = new Map<string, string>();
    const { data, error } = await createPkceClient(store).auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${env.API_URL}/api/auth/google/callback`,
            skipBrowserRedirect: true,
            queryParams: { prompt: 'select_account' },
        },
    });
    const verifier = store.get(PKCE_KEY);
    if (error || !data.url || !verifier) return res.redirect(`${env.FRONTEND_URL}/login?error=oauth`);
 
    setPkceCookie(res, verifier);
    return res.redirect(data.url);
};
 
export const googleCallback = async (req: Request, res: Response) => {
    const code = req.query.code;
    const verifier = req.cookies?.[PKCE_COOKIE];
    clearPkceCookie(res);
 
    if (typeof code !== 'string' || typeof verifier !== 'string') {
        return res.redirect(`${env.FRONTEND_URL}/login?error=oauth`);
    }
 
    const store = new Map<string, string>([[PKCE_KEY, verifier]]);
    const { data, error } = await createPkceClient(store).auth.exchangeCodeForSession(code);
    if (error || !data.session) return res.redirect(`${env.FRONTEND_URL}/login?error=oauth`);
 
    setAuthCookies(res, data.session);
    return res.redirect(`${env.FRONTEND_URL}/dashboard`);
};
 
// ---------- REFRESH ----------
export const refresh = async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (typeof refreshToken !== 'string') return res.status(401).json({ error: 'No autenticado' });
 
    const { data, error } = await createAnonClient().auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) {
        clearAuthCookies(res);
        return res.status(401).json({ error: 'Sesión expirada. Inicia sesión de nuevo.' });
    }
    setAuthCookies(res, data.session); // Supabase rota el refresh token: se reemplaza el anterior
    return res.status(200).json({ message: 'Sesión renovada' });
};
 
// ---------- LOGOUT ----------
export const logout = async (req: Request, res: Response) => {
    const token = req.cookies?.[ACCESS_COOKIE];
    if (typeof token === 'string') {
        // Revoca la sesión en Supabase (invalida también el refresh token de esta sesión)
        await supabaseAdmin.auth.admin.signOut(token, 'local').catch(() => undefined);
    }
    clearAuthCookies(res);
    return res.status(200).json({ message: 'Sesión cerrada' });
};
 
// ---------- PERFIL ACTUAL ----------
export const me = async (req: Request, res: Response) => {
    const profile = await getProfile(req.user!.id);
    return res.status(200).json({ user: { id: req.user!.id, email: req.user!.email, ...profile } });
};