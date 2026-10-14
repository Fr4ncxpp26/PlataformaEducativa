import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';
import { AuthContext } from './AuthContext';
import type { RegisterData } from './AuthContext';
import type { AuthUser, ProfilePatch } from '../types/user';
 
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
 
    // Al cargar la app: ¿hay sesión? (también aplica al volver de Google)
    useEffect(() => {
        api<{ user: AuthUser }>('/auth/me')
            .then((r) => setUser(r.user))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);
 
    const login = useCallback(async (email: string, password: string) => {
        const r = await api<{ user: AuthUser }>('/auth/login', { method: 'POST', body: { email, password } });
        setUser(r.user);
    }, []);
 
    const register = useCallback(async (data: RegisterData) => {
        const r = await api<{ message: string }>('/auth/register', { method: 'POST', body: data });
        return r.message;
    }, []);
 
    const logout = useCallback(async () => {
        try { await api('/auth/logout', { method: 'POST' }); } finally { setUser(null); }
    }, []);
 
    // El servidor devuelve el perfil actualizado: el header y las demás vistas se sincronizan solas
    const updateProfile = useCallback(async (patch: ProfilePatch) => {
        const r = await api<{ user: AuthUser }>('/users/me', { method: 'PATCH', body: patch });
        setUser(r.user);
    }, []);
 
    const deleteAccount = useCallback(async () => {
        await api('/users/me', { method: 'DELETE', body: { confirm: 'ELIMINAR' } });
        setUser(null);
    }, []);
 
    const value = useMemo(
        () => ({ user, loading, login, register, logout, updateProfile, deleteAccount }),
        [user, loading, login, register, logout, updateProfile, deleteAccount],
    );
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}