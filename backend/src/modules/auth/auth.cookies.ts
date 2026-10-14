import { CookieOptions, Response } from 'express';
import { Session } from '@supabase/supabase-js';
import { env } from '../../config/env';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
export const PKCE_COOKIE = 'pkce_verifier';

const base: CookieOptions = {
    httpOnly: true,                          // JS del navegador no puede leerla (anti-XSS)
    secure: env.NODE_ENV === 'production',   // solo HTTPS en producción
    sameSite: 'lax',                         // anti-CSRF. Si front y API están en sitios distintos en prod: usa dominios hermanos (app./api.tudominio.com)
};

const ACCESS_PATH = '/';
const REFRESH_PATH = '/api/auth'; // el refresh token solo viaja a endpoints de auth
export const PKCE_PATH = '/api/auth/google';

export const setAuthCookies = (res: Response, session: Session) => {
    res.cookie(ACCESS_COOKIE, session.access_token, { ...base, path: ACCESS_PATH, maxAge: session.expires_in * 1000 });
    res.cookie(REFRESH_COOKIE, session.refresh_token, { ...base, path: REFRESH_PATH, maxAge: 30 * 24 * 60 * 60 * 1000 });
};

export const clearAuthCookies = (res: Response) => {
    res.clearCookie(ACCESS_COOKIE, { ...base, path: ACCESS_PATH });
    res.clearCookie(REFRESH_COOKIE, { ...base, path: REFRESH_PATH });
};

export const setPkceCookie = (res: Response, verifier: string) =>
    res.cookie(PKCE_COOKIE, verifier, { ...base, path: PKCE_PATH, maxAge: 10 * 60 * 1000 });

export const clearPkceCookie = (res: Response) => res.clearCookie(PKCE_COOKIE, { ...base, path: PKCE_PATH });