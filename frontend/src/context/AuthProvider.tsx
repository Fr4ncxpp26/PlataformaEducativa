import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, setApiCacheScope } from '../lib/api';
import { AuthContext } from './AuthContext';
import type { RegisterData } from './AuthContext';
import type { AuthUser, ProfilePatch } from '../types/user';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        api<{ user: AuthUser }>('/auth/me')
            .then((response) => {
                if (!active) return;
                setApiCacheScope(response.user.id);
                setUser(response.user);
            })
            .catch(() => {
                if (!active) return;
                setApiCacheScope('anonymous');
                setUser(null);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const response = await api<{ user: AuthUser }>('/auth/login', { method: 'POST', body: { email, password } });
        setApiCacheScope(response.user.id);
        setUser(response.user);
    }, []);

    const register = useCallback(async (data: RegisterData) => {
        const response = await api<{ message: string }>('/auth/register', { method: 'POST', body: data });
        return response.message;
    }, []);

    const logout = useCallback(async () => {
        try {
            await api('/auth/logout', { method: 'POST' });
        } finally {
            setApiCacheScope('anonymous');
            setUser(null);
        }
    }, []);

    const updateProfile = useCallback(async (patch: ProfilePatch) => {
        const response = await api<{ user: AuthUser }>('/users/me', { method: 'PATCH', body: patch });
        setApiCacheScope(response.user.id);
        setUser(response.user);
    }, []);

    const deleteAccount = useCallback(async () => {
        await api('/users/me', { method: 'DELETE', body: { confirm: 'ELIMINAR' } });
        setApiCacheScope('anonymous');
        setUser(null);
    }, []);

    const value = useMemo(
        () => ({ user, loading, login, register, logout, updateProfile, deleteAccount }),
        [user, loading, login, register, logout, updateProfile, deleteAccount],
    );
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
