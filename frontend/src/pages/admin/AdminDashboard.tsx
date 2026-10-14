import { useCallback, useEffect, useState } from 'react';
import {
    Award, BookOpen, CalendarClock, ClipboardList, CreditCard, DollarSign, GraduationCap, RefreshCw, Users,
} from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { formatDate, formatMoney } from '../../lib/format';
import { Alert, Button, Spinner } from '../../components/ui';
import { Badge, PageHeader, StatCard, statusTone } from '../../components/admin/AdminUI';
import type { AdminStats } from '../../types/admin';
import { ROL_LABEL } from '../../types/user';
import type { Rol } from '../../types/user';

export default function AdminDashboard() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try { setStats(await api<AdminStats>('/admin/stats')); }
        catch (e) { setError(errorMessage(e)); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { void load(); }, [load]);

    if (!stats && loading) return <Spinner />;
    if (!stats) return <Alert type="error">{error || 'Sin datos'}</Alert>;

    const maxRole = Math.max(1, ...Object.values(stats.users.byRole));

    return (
        <div>
            <PageHeader
                title="Panel de administración"
                subtitle="Resumen general de la plataforma"
                action={<Button variant="ghost" onClick={load} loading={loading}><span className="flex items-center gap-1"><RefreshCw size={14} /> Actualizar</span></Button>}
            />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Usuarios" value={stats.users.total} icon={Users} hint="Cuentas registradas" />
                <StatCard label="Cursos" value={stats.courses.total} icon={BookOpen} tone="blue" hint={`${stats.courses.published} publicados`} />
                <StatCard label="Inscripciones" value={stats.enrollments} icon={ClipboardList} tone="purple" hint={`${stats.lessons} lecciones en total`} />
                <StatCard label="Ingresos" value={formatMoney(stats.payments.revenue)} icon={DollarSign} tone="green" hint={`${stats.payments.completados} pagos completados`} />
                <StatCard label="Tutorías programadas" value={stats.tutorings.programada} icon={CalendarClock} tone="amber" hint={`${stats.tutorings.completada} completadas · ${stats.tutorings.cancelada} canceladas`} />
                <StatCard label="Pagos pendientes" value={stats.payments.pendientes} icon={CreditCard} tone="red" hint="Requieren revisión" />
                <StatCard label="Certificados" value={stats.certificates} icon={Award} tone="indigo" hint="Emitidos" />
                <StatCard label="Alumnos" value={(stats.users.byRole.alumno_adulto ?? 0) + (stats.users.byRole.alumno_menor ?? 0)} icon={GraduationCap} tone="green" hint="Menores y adultos" />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 font-semibold text-slate-800">Usuarios por rol</h2>
                    <div className="space-y-3">
                        {Object.entries(stats.users.byRole).map(([rol, n]) => (
                            <div key={rol}>
                                <div className="mb-1 flex justify-between text-sm">
                                    <span className="text-slate-600">{ROL_LABEL[rol as Rol] ?? rol}</span>
                                    <span className="font-medium text-slate-800">{n}</span>
                                </div>
                                <div className="h-2 rounded-full bg-slate-100">
                                    <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${(n / maxRole) * 100}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 font-semibold text-slate-800">Actividad reciente</h2>
                    {stats.recent.length === 0 ? (
                        <p className="text-sm text-slate-400">Aún no hay acciones registradas.</p>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {stats.recent.map((l) => (
                                <li key={l.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                                    <span className="flex items-center gap-2 text-slate-700">
                                        <Badge tone={statusTone(l.action)}>{l.action}</Badge>
                                        {l.entity} · <span className="text-slate-500">{l.admin?.nombre ?? 'Sistema'}</span>
                                    </span>
                                    <span className="whitespace-nowrap text-xs text-slate-400">{formatDate(l.created_at)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}