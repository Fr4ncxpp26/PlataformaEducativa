import { Link } from 'react-router-dom';
import { BookOpen, CalendarClock, GraduationCap, Plus, Users } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/useAuth';
import { Alert, Spinner } from '../../components/ui';
import { Badge, StatCard } from '../../components/admin/AdminUI';
import type { TeacherOverview } from '../../types/learning';

export default function TeacherDashboard() {
    const { user } = useAuth();
    const { data, error, loading } = useApi<TeacherOverview>('/manage/overview');
    if (!data) return error ? <Alert type="error">{error}</Alert> : loading ? <Spinner /> : null;
    const t = data.totals;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold text-slate-800">Panel del profesor — {user?.nombre.split(' ')[0]}</h1>
                <div className="flex gap-2">
                    <Link to="/profesor/tutorias" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Mis tutorías</Link>
                    <Link to="/gestion/cursos/nuevo" className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"><Plus size={16} /> Nuevo curso</Link>
                </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Mis cursos" value={t.courses} icon={BookOpen} hint={`${t.published} publicados`} />
                <StatCard label="Alumnos inscritos" value={t.students} icon={Users} tone="blue" />
                <StatCard label="Graduados" value={t.graduates} icon={GraduationCap} tone="green" hint="Con certificado" />
                <StatCard label="Tutorías próximas" value={t.upcoming} icon={CalendarClock} tone="amber" />
            </div>
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Curso</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Alumnos</th><th className="px-4 py-3">Graduados</th><th /></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.courses.map((c) => (
                            <tr key={c.id}>
                                <td className="px-4 py-3 font-medium text-slate-800">{c.title}</td>
                                <td className="px-4 py-3"><Badge tone={c.is_published ? 'green' : 'amber'}>{c.is_published ? 'Publicado' : 'Borrador'}</Badge></td>
                                <td className="px-4 py-3">{c.students}</td><td className="px-4 py-3">{c.graduates}</td>
                                <td className="px-4 py-3 text-right"><Link to={`/gestion/cursos/${c.id}`} className="text-sm font-semibold text-indigo-600">Gestionar →</Link></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {data.courses.length === 0 && <p className="px-6 py-12 text-center text-sm text-slate-400">Aún no has creado cursos. ¡Crea el primero!</p>}
            </section>
        </div>
    );
}