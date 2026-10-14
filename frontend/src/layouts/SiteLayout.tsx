import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { Spinner } from '../components/ui';
import AppLayout from './AppLayout';

// Páginas públicas (catálogo): con sesión usan el menú de la app; sin sesión, un encabezado público
export default function SiteLayout() {
    const { user, loading } = useAuth();
    if (loading) return <Spinner />;
    if (user) return <AppLayout />;

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
                    <Link to="/" className="text-lg font-bold text-indigo-600">Escuela Digital</Link>
                    <nav className="flex items-center gap-3 text-sm font-medium">
                        <Link to="/login" className="rounded-lg border border-slate-300 px-4 py-1.5 text-slate-700 hover:bg-slate-50">Entrar</Link>
                        <Link to="/register" className="rounded-lg bg-indigo-600 px-4 py-1.5 text-white hover:bg-indigo-700">Registrarme</Link>
                    </nav>
                </div>
            </header>
            <main className="mx-auto max-w-6xl px-4 py-8"><Outlet /></main>
        </div>
    );
}