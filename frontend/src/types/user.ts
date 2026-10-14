export type Rol = 'alumno_menor' | 'alumno_adulto' | 'padre_tutor' | 'profesor' | 'editor' | 'admin';
 
export interface AuthUser {
    id: string;
    email?: string;
    nombre: string;
    avatar_url: string | null;
    rol: Rol;
    headline?: string | null;
    bio?: string | null;
    telefono?: string | null;
    pais?: string | null;
    ranking_visible?: boolean;
}
 
// Campos que el usuario puede editar en su perfil (PATCH /users/me)
export interface ProfilePatch {
    nombre?: string;
    avatar_url?: string | null;
    headline?: string | null;
    bio?: string | null;
    telefono?: string | null;
    pais?: string | null;
    ranking_visible?: boolean;
}
 
// GET /users/me
export interface ProfileData {
    user: AuthUser;
    auth: { hasPassword: boolean; providers: string[]; created_at: string; last_sign_in_at: string | null };
    summary: { label: string; value: string | number }[];
}
 
export const ROL_LABEL: Record<Rol, string> = {
    alumno_menor: 'Alumno (menor)',
    alumno_adulto: 'Alumno',
    padre_tutor: 'Padre / Tutor',
    profesor: 'Profesor',
    editor: 'Editor de contenidos',
    admin: 'Administrador',
};
 