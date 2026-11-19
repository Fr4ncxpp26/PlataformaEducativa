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

interface CacheEntry { expiresAt: number; data: unknown }
const responseCache = new Map<string, CacheEntry>();
const inFlightReads = new Map<string, Promise<unknown>>();
let cacheScope = 'anonymous';
let cacheGeneration = 0;

export function clearApiCache(): void {
    cacheGeneration += 1;
    responseCache.clear();
    inFlightReads.clear();
}

export function setApiCacheScope(userId: string | null | undefined): void {
    const nextScope = userId || 'anonymous';
    if (nextScope !== cacheScope) {
        cacheScope = nextScope;
        clearApiCache();
    }
}

const cacheTtlFor = (path: string, method: string): number => {
    if (method !== 'GET') return 0;
    if (path === '/public/courses' || path.startsWith('/public/courses?') || path.startsWith('/public/courses/')) return 45_000;
    if (path.startsWith('/admin/options/') || path.startsWith('/manage/options/')) return 90_000;
    return 0;
};

const cloneJson = <T,>(value: unknown): T => JSON.parse(JSON.stringify(value)) as T;

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

interface Options { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown }
const NO_RETRY = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

async function performRequest<T>(path: string, opts: Options, retry: boolean, cacheKey: string, ttl: number, generation: number): Promise<T> {
    const method = opts.method ?? 'GET';
    const res = await fetch('/api' + path, {
        method,
        credentials: 'include',
        headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });

    if (res.status === 401 && retry && !NO_RETRY.includes(path) && (await refreshSession())) {
        return performRequest<T>(path, opts, false, cacheKey, ttl, generation);
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(res.status, data?.error ?? 'Error inesperado', data?.code, data?.errors);

    if (method !== 'GET') clearApiCache();
    else if (ttl > 0 && generation === cacheGeneration) {
        responseCache.set(cacheKey, { expiresAt: Date.now() + ttl, data });
    }
    return data as T;
}

export async function api<T>(path: string, opts: Options = {}, retry = true): Promise<T> {
    const method = opts.method ?? 'GET';
    const ttl = cacheTtlFor(path, method);
    if (ttl <= 0) return performRequest<T>(path, opts, retry, '', 0, cacheGeneration);

    const key = cacheScope + ':' + path;
    const cached = responseCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cloneJson<T>(cached.data);
    if (cached) responseCache.delete(key);

    const pending = inFlightReads.get(key);
    if (pending) return cloneJson<T>(await pending);

    const generation = cacheGeneration;
    const request = performRequest<T>(path, opts, retry, key, ttl, generation);
    inFlightReads.set(key, request);
    try {
        return await request;
    } finally {
        if (inFlightReads.get(key) === request) inFlightReads.delete(key);
    }
}

export const errorMessage = (e: unknown) =>
    e instanceof ApiError
        ? e.details ? Object.values(e.details).flat().join('. ') : e.message
        : 'No se pudo conectar con el servidor';

export type UploadFolder =
    | 'avatars'
    | 'courses/covers'
    | 'courses/pdfs'
    | 'courses/lessons'
    | 'achievements'
    | 'tutorings'
    | 'certificates';

export interface UploadedFileResponse {
    url: string;
    publicId: string;
    format: string;
    resourceType: string;
    bytes: number;
    originalFilename: string;
}

export async function uploadMediaFile(file: File, folder: UploadFolder, previousPublicId?: string): Promise<UploadedFileResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    if (previousPublicId) formData.append('previousPublicId', previousPublicId);

    const response = await fetch('/api/uploads', {
        method: 'POST',
        credentials: 'include',
        body: formData,
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al subir el archivo a Cloudinary');
    }

    clearApiCache();
    const data = await response.json();
    return data.file;
}
