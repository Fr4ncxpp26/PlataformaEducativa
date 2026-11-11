import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const allowedOrigin = new URL(env.FRONTEND_URL).origin;

/**
 * The API authenticates with HttpOnly cookies. Requiring the configured
 * frontend Origin (or a same-origin Referer fallback) on state-changing
 * requests prevents cross-site forms from using a visitor's session.
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method.toUpperCase())) return next();

    const originHeader = req.get('origin');
    const refererHeader = req.get('referer');
    let requestOrigin: string | null = null;

    if (originHeader) {
        try {
            requestOrigin = new URL(originHeader).origin;
        } catch {
            requestOrigin = null;
        }
    } else if (refererHeader) {
        try {
            requestOrigin = new URL(refererHeader).origin;
        } catch {
            requestOrigin = null;
        }
    }

    if (!requestOrigin || requestOrigin !== allowedOrigin) {
        return res.status(403).json({
            error: 'El origen de la solicitud no está permitido.',
            code: 'CSRF_ORIGIN_MISMATCH',
        });
    }

    return next();
};
