export class ApiError extends Error {
    status: number;
    code?: string;
    details?: Record<string, string[]>;
    constructor(status: number, message: string, code?: string, details?: Record<string, string[]>) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

// Solo una renovación a la vez, aunque varias peticiones fallen juntas (el refresh token es de un solo uso)
let refreshing: Promise<boolean> | null = null;
const refreshSession = () => {
    if (!refreshing) {
        refreshing = fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
            .then((r) => r.ok)
            .catch(() => false)
            .finally(() => { refreshing = null; });
    }
    return refreshing;
};

const NO_RETRY = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

interface Options { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown }

export async function api<T>(path: string, opts: Options = {}, retry = true): Promise<T> {
    const res = await fetch(`/api${path}`, {
        method: opts.method ?? 'GET',
        credentials: 'include', // envía las cookies httpOnly
        headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });

    // Access token vencido -> renovar y reintentar UNA vez
    if (res.status === 401 && retry && !NO_RETRY.includes(path) && (await refreshSession())) {
        return api<T>(path, opts, false);
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(res.status, data?.error ?? 'Error inesperado', data?.code, data?.errors);
    return data as T;
}

export const errorMessage = (e: unknown) =>
    e instanceof ApiError
        ? e.details ? Object.values(e.details).flat().join('. ') : e.message
        : 'No se pudo conectar con el servidor';