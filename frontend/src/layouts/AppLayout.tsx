import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { Avatar, Button } from '../components/ui';
import type { Rol } from '../types/user';

type NavItem = { to: string; label: string; end?: boolean };

const menu = (rol: Rol): NavItem[] => {
    const catalog: NavItem = { to: '/cursos', label: 'Catálogo' };
    const profile: NavItem = { to: '/dashboard/perfil', label: 'Mi perfil' };

    switch (rol) {
        case 'alumno_adulto':
        case 'alumno_menor':
            return [
                { to: '/dashboard', label: 'Inicio', end: true },
                catalog,
                { to: '/mis-cursos', label: 'Mis cursos' },
                { to: '/tutorias', label: 'Tutorías' },
                { to: '/logros', label: 'Logros y certificados' },
                ...(rol === 'alumno_adulto' ? [{ to: '/ranking', label: 'Ranking' }] : []),
                profile,
            ];
        case 'profesor':
            return [
                { to: '/dashboard', label: 'Inicio', end: true },
                { to: '/gestion/cursos', label: 'Mis cursos' },
                { to: '/profesor/tutorias', label: 'Tutorías' },
                catalog,
                profile,
            ];
        case 'padre_tutor':
            return [
                { to: '/tutor', label: 'Mis alumnos' },
                catalog,
                profile,
            ];
        case 'admin':
            return [
                { to: '/admin', label: 'Panel admin' },
                { to: '/gestion/cursos', label: 'Cursos' },
                catalog,
                profile,
            ];
        default:
            return [{ to: '/dashboard', label: 'Inicio', end: true }, catalog, profile];
    }
};

export default function AppLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    if (!user) return null;

    const onLogout = async () => {
        setBusy(true);
        try {
            await logout();
        } catch {
            // AuthProvider limpia el estado local incluso si el servidor no responde.
        } finally {
            setBusy(false);
            navigate('/login', { replace: true });
        }
    };

    const linkClass = ({ isActive }: { isActive: boolean }) =>
        `block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
            isActive
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`;

    const navItems = menu(user.rol);
    const closeMobile = () => setMobileOpen(false);

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
                    <Link to="/dashboard" className="shrink-0 text-lg font-bold text-indigo-600">
                        Escuela Digital
                    </Link>

                    <nav aria-label="Navegación principal" className="hidden min-w-0 flex-1 justify-center gap-1 overflow-x-auto px-3 lg:flex">
                        {navItems.map((item) => (
                            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="flex shrink-0 items-center gap-2">
                        <Avatar nombre={user.nombre} url={user.avatar_url} size="h-8 w-8" />
                        <span className="hidden max-w-36 truncate text-sm text-slate-700 xl:block">{user.nombre}</span>
                        <Button variant="ghost" onClick={onLogout} loading={busy} className="hidden sm:inline-flex">
                            <span className="flex items-center gap-1"><LogOut size={15} /> Salir</span>
                        </Button>
                        <button
                            type="button"
                            onClick={() => setMobileOpen((open) => !open)}
                            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
                            aria-expanded={mobileOpen}
                            aria-controls="mobile-navigation"
                            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
                        >
                            {mobileOpen ? <X size={21} /> : <Menu size={21} />}
                        </button>
                    </div>
                </div>

                {mobileOpen && (
                    <nav id="mobile-navigation" aria-label="Navegación móvil" className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
                        <div className="mx-auto grid max-w-6xl gap-1 sm:grid-cols-2">
                            {navItems.map((item) => (
                                <NavLink key={item.to} to={item.to} end={item.end} className={linkClass} onClick={closeMobile}>
                                    {item.label}
                                </NavLink>
                            ))}
                            <button
                                type="button"
                                onClick={() => { closeMobile(); void onLogout(); }}
                                disabled={busy}
                                className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 sm:col-span-2"
                            >
                                Cerrar sesión
                            </button>
                        </div>
                    </nav>
                )}
            </header>

            <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
                <Outlet />
            </main>
        </div>
    );
}
