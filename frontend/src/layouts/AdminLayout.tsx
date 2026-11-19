import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
    Award, BookOpen, CalendarClock, ClipboardList, CreditCard, Layers, LayoutDashboard,
    Link2, LogOut, Menu, ScrollText, ShieldCheck, Trophy, UserCircle, Users, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { Avatar } from '../components/ui';
import NotificationBell from '../components/NotificationBell';

interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean }

const NAV: { title: string; items: NavItem[] }[] = [
    { title: 'General', items: [{ to: '/admin', label: 'Panel', icon: LayoutDashboard, end: true }] },
    { title: 'Personas', items: [
        { to: '/admin/usuarios', label: 'Usuarios', icon: Users },
        { to: '/admin/vinculaciones', label: 'Padres e hijos', icon: Link2 },
    ] },
    { title: 'Académico', items: [
        { to: '/admin/materias', label: 'Materias', icon: Layers },
        { to: '/admin/cursos', label: 'Cursos', icon: BookOpen },
        { to: '/admin/inscripciones', label: 'Inscripciones', icon: ClipboardList },
        { to: '/admin/certificados', label: 'Certificados', icon: Award },
        { to: '/admin/logros', label: 'Logros', icon: Trophy },
    ] },
    { title: 'Servicios', items: [
        { to: '/admin/tutorias', label: 'Tutorías', icon: CalendarClock },
        { to: '/admin/pagos', label: 'Pagos', icon: CreditCard },
    ] },
    { title: 'Sistema', items: [{ to: '/admin/registros', label: 'Registros', icon: ScrollText }] },
];

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);

    if (!user) return null;

    const onLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    const link = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`;

    const sidebar = (
        <aside aria-label="Navegación de administración" className="flex h-full w-64 flex-col bg-slate-900">
            <div className="flex items-center gap-2 px-5 py-5 text-white">
                <ShieldCheck className="text-indigo-400" />
                <div>
                    <p className="text-sm font-bold leading-none">Escuela Digital</p>
                    <p className="mt-1 text-xs text-slate-400">Administración</p>
                </div>
            </div>
            <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
                {NAV.map((g) => (
                    <div key={g.title}>
                        <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{g.title}</p>
                        <div className="space-y-1">
                            {g.items.map(({ to, label, icon: Icon, end }) => (
                                <NavLink key={to} to={to} end={end} className={link} onClick={() => setOpen(false)}>
                                    <Icon size={18} /> {label}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>
            <div className="border-t border-slate-800 p-3">
                <Link to="/dashboard/perfil" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
                    <UserCircle size={18} /> Mi perfil
                </Link>
            </div>
        </aside>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">{sidebar}</div>

            {open && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <button type="button" aria-label="Cerrar menú de administración" className="absolute inset-0 cursor-default bg-slate-900/60" onClick={() => setOpen(false)} />
                    <div id="admin-navigation-mobile-panel" className="relative h-full w-64">
                        {sidebar}
                        <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-3 rounded-lg p-2 text-white hover:bg-slate-800" aria-label="Cerrar menú"><X /></button>
                    </div>
                </div>
            )}

            <div className="lg:pl-64">
                <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
                    <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-md p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:hidden" aria-label={open ? "Cerrar menú" : "Abrir menú"} aria-expanded={open} aria-controls="admin-navigation-mobile-panel">
                        {open ? <X size={20} /> : <Menu size={20} />}
                    </button>
                    <div className="hidden text-sm text-slate-500 lg:block">Panel de administración</div>
                    <div className="flex items-center gap-3">
                        <NotificationBell />
                        <Avatar nombre={user.nombre} url={user.avatar_url} size="h-8 w-8" />
                        <div className="hidden text-right sm:block">
                            <p className="text-sm font-medium leading-none text-slate-800">{user!.nombre}</p>
                            <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                        </div>
                        <button type="button" onClick={onLogout} aria-label="Cerrar sesión" className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                            <LogOut size={16} /> <span className="hidden sm:inline">Cerrar sesión</span>
                        </button>
                    </div>
                </header>
                <main className="mx-auto max-w-7xl px-4 py-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}