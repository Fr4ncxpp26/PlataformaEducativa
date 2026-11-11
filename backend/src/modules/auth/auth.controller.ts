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
const GENERIC_REGISTER_ERROR = 'No se pudo completar el registro. Verifica los datos e inténtalo nuevamente.';

// ---------- REGISTRO ----------
export const register = async (req: Request, res: Response) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: fieldErrors(parsed.error), code: 'VALIDATION_ERROR' });

    const { email, password, nombre, rol } = parsed.data;
    const { error } = await createAnonClient().auth.signUp({
        email,
        password,
        options: { data: { nombre, rol }, emailRedirectTo: `${env.FRONTEND_URL}/login` },
    });

    // No se devuelve error.message: el proveedor puede revelar existencia de cuentas o detalles internos.
    if (error) return res.status(400).json({ error: GENERIC_REGISTER_ERROR, code: 'REGISTER_FAILED' });

    return res.status(201).json({ message: 'Registro recibido. Revisa tu correo para confirmar tu cuenta.' });
};

// Solo padre_tutor: crea cuenta de menor ya vinculada (guardian_student).
export const registerMinor = async (req: Request, res: Response) => {
    const parsed = registerMinorSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: fieldErrors(parsed.error), code: 'VALIDATION_ERROR' });

    const { email, password, nombre } = parsed.data;
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nombre, rol: 'alumno_menor' },
    });

    if (error || !data.user) {
        return res.status(400).json({ error: GENERIC_REGISTER_ERROR, code: 'REGISTER_MINOR_FAILED' });
    }

    const { error: linkError } = await supabaseAdmin
        .from('guardian_student')
        .insert({ guardian_id: req.user!.id, student_id: data.user.id });

    if (linkError) {
        // Rollback: una cuenta sin vinculación no debe quedar creada parcialmente.
        const { error: rollbackError } = await supabaseAdmin.auth.admin.deleteUser(data.user.id);
        if (rollbackError) console.error('No se pudo revertir una creación de cuenta incompleta.');
        return res.status(500).json({ error: 'No se pudo vincular la cuenta. Inténtalo nuevamente.', code: 'GUARDIAN_LINK_FAILED' });
    }

    return res.status(201).json({ message: 'Cuenta creada y vinculada correctamente.' });
};

// ---------- LOGIN ----------
export const login = async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos.', code: 'VALIDATION_ERROR' });

    const { data, error } = await createAnonClient().auth.signInWithPassword(parsed.data);
    if (error || !data.session) {
        if (error?.code === 'email_not_confirmed') {
            return res.status(403).json({ error: 'Confirma tu correo antes de iniciar sesión.', code: 'EMAIL_NOT_CONFIRMED' });
        }
        return res.status(401).json({ error: 'Correo o contraseña incorrectos.', code: 'INVALID_CREDENTIALS' });
    }

    const profile = await getProfile(data.user.id);
    if (!profile) {
        await supabaseAdmin.auth.admin.signOut(data.session.access_token, 'local').catch(() => undefined);
        clearAuthCookies(res);
        return res.status(403).json({ error: 'No se pudo cargar tu perfil. Contacta con soporte.', code: 'PROFILE_UNAVAILABLE' });
    }

    // El id del perfil se omite: la respuesta conserva como id canónico el de Supabase Auth.
    const { id: _profileId, ...profileData } = profile;

    setAuthCookies(res, data.session);
    return res.status(200).json({ user: { id: data.user.id, email: data.user.email, ...profileData } });
};

// ---------- GOOGLE (OAuth + PKCE) ----------
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

    const profile = await getProfile(data.user.id);
    if (!profile) {
        await supabaseAdmin.auth.admin.signOut(data.session.access_token, 'local').catch(() => undefined);
        return res.redirect(`${env.FRONTEND_URL}/login?error=profile`);
    }

    setAuthCookies(res, data.session);
    return res.redirect(`${env.FRONTEND_URL}/dashboard`);
};

// ---------- REFRESH ----------
export const refresh = async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (typeof refreshToken !== 'string') {
        return res.status(401).json({ error: 'Tu sesión expiró. Inicia sesión nuevamente.', code: 'TOKEN_EXPIRED' });
    }

    const { data, error } = await createAnonClient().auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) {
        clearAuthCookies(res);
        return res.status(401).json({ error: 'Tu sesión expiró. Inicia sesión nuevamente.', code: 'TOKEN_EXPIRED' });
    }

    setAuthCookies(res, data.session);
    return res.status(200).json({ message: 'Sesión renovada.' });
};

// ---------- LOGOUT ----------
export const logout = async (req: Request, res: Response) => {
    const token = req.cookies?.[ACCESS_COOKIE];
    if (typeof token === 'string') {
        await supabaseAdmin.auth.admin.signOut(token, 'local').catch(() => undefined);
    }

    clearAuthCookies(res);
    return res.status(200).json({ message: 'Sesión cerrada.' });
};

// ---------- PERFIL ACTUAL ----------
export const me = async (req: Request, res: Response) => {
    const profile = await getProfile(req.user!.id);
    if (!profile) return res.status(404).json({ error: 'Perfil no disponible.', code: 'PROFILE_NOT_FOUND' });

    // El id del perfil se omite para evitar sobrescribir el id de Supabase Auth.
    const { id: _profileId, ...profileData } = profile;
    return res.status(200).json({ user: { id: req.user!.id, email: req.user!.email, ...profileData } });
};
