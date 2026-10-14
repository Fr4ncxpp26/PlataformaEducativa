import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { Avatar, Button } from '../components/ui';
import type { Rol } from '../types/user';
 
type NavItem = { to: string; label: string; end?: boolean };
 
// Menú según el rol de la sesión
const menu = (rol: Rol): NavItem[] => {
    const catalog = { to: '/cursos', label: 'Catálogo' };
    const profile = { to: '/dashboard/perfil', label: 'Mi perfil' };
    switch (rol) {
        case 'alumno_adulto':
        case 'alumno_menor':
            return [{ to: '/dashboard', label: 'Inicio', end: true }, catalog, { to: '/mis-cursos', label: 'Mis cursos' }, { to: '/tutorias', label: 'Tutorías' }, { to: '/logros', label: 'Logros y certificados' }, ...(rol === 'alumno_adulto' ? [{ to: '/ranking', label: 'Ranking' }] : []), profile];
        case 'profesor':
            return [{ to: '/dashboard', label: 'Inicio', end: true }, { to: '/gestion/cursos', label: 'Mis cursos' }, { to: '/profesor/tutorias', label: 'Tutorías' }, catalog, profile];
        case 'padre_tutor':
            return [{ to: '/tutor', label: 'Mis alumnos' }, catalog, profile];
        case 'admin':
            return [{ to: '/admin', label: 'Panel admin' }, { to: '/gestion/cursos', label: 'Cursos' }, catalog, profile];
        default:
            return [{ to: '/dashboard', label: 'Inicio', end: true }, catalog, profile];
    }
};
 
export default function AppLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
 
    const onLogout = async () => {
        setBusy(true);
        await logout();
        navigate('/login', { replace: true });
    };
 
    const link = ({ isActive }: { isActive: boolean }) =>
        `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`;
 
    return (
        <div className="min-h-screen bg-slate-50">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
                    <span className="text-lg font-bold text-indigo-600">Escuela Digital</span>
                    <div className="flex items-center gap-3">
                        <Avatar nombre={user!.nombre} url={user!.avatar_url} size="h-8 w-8" />
                        <span className="hidden text-sm text-slate-700 sm:block">{user!.nombre}</span>
                        <Button variant="ghost" onClick={onLogout} loading={busy}>Cerrar sesión</Button>
                    </div>
                </div>
                <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
                    {menu(user!.rol).map((l) => <NavLink key={l.to} to={l.to} end={l.end} className={link}>{l.label}</NavLink>)}
                </nav>
            </header>
            <main className="mx-auto max-w-6xl px-4 py-8"><Outlet /></main>
        </div>
    );
}