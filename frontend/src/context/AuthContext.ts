import { createContext } from 'react';
import type { AuthUser, ProfilePatch, Rol } from '../types/user';
 
export interface RegisterData { nombre: string; email: string; password: string; rol: Extract<Rol, 'alumno_adulto' | 'padre_tutor'> }
 
export interface AuthContextValue {
    user: AuthUser | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (data: RegisterData) => Promise<string>;
    logout: () => Promise<void>;
    updateProfile: (patch: ProfilePatch) => Promise<void>;
    deleteAccount: () => Promise<void>;
}
 
export const AuthContext = createContext<AuthContextValue | null>(null);