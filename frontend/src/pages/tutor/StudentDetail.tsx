import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Flame, Star, Trophy } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useApi } from '../../hooks/useapi';
import { formatDate, formatHours } from '../../lib/format';
import { lessonTypeLabel } from '../../lib/course';
import { Alert, Avatar, Button, Spinner } from '../../components/ui';
import { Badge, StatCard } from '../../components/admin/AdminUI';
import WeekStreak from '../../components/student/WeekStreak';
import type { GuardianStudentDetail } from '../../types/learning';

export default function StudentDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: d, error, loading } = useApi<GuardianStudentDetail>(`/guardian/students/${id}`);
    if (!d) return error ? <Alert type="error">{error}</Alert> : loading ? <Spinner /> : null;

    const unlink = async () => {
        if (!window.confirm(`¿Desvincular a ${d.profile.nombre}? Dejarás de ver su avance.`)) return;
        try { await api(`/guardian/students/${id}`, { method: 'DELETE' }); navigate('/tutor', { replace: true }); } catch (e) { window.alert(errorMessage(e)); }
    };

    return (
        <div className="space-y-6">
            <Link to="/tutor" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600"><ArrowLeft size={14} /> Mis alumnos</Link>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3"><Avatar nombre={d.profile.nombre} url={d.profile.avatar_url} size="h-14 w-14 text-xl" /><h1 className="text-2xl font-bold text-slate-800">{d.profile.nombre}</h1></div>
                <Button variant="ghost" onClick={unlink}>Desvincular</Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Puntos" value={d.stats.points} icon={Star} tone="amber" hint={`${d.stats.lessons} lecciones`} />
                <StatCard label="Racha" value={`${d.stats.streak} días`} icon={Flame} tone="red" hint={`Mejor: ${d.stats.maxStreak}`} />
                <StatCard label="Tiempo de estudio" value={formatHours(d.studyMinutes)} icon={Clock} tone="blue" />
                <StatCard label="Certificados" value={d.stats.courses} icon={Trophy} tone="green" />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <section className="space-y-3">
                    <h2 className="font-semibold text-slate-800">Cursos y avance</h2>
                    {d.courses.map((c) => (
                        <div key={c.course.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium text-slate-800">{c.course.title}</span><span className="text-slate-500">{c.completed}/{c.total} · {c.percent}%</span></div>
                            <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${c.percent}%` }} /></div>
                            {c.certificate_id && <Link to={`/verificar/${c.certificate_id}`} className="mt-2 inline-block text-xs font-medium text-green-700">🎓 Certificado obtenido</Link>}
                        </div>
                    ))}
                    {d.courses.length === 0 && <p className="text-sm text-slate-400">Aún no está inscrito en cursos.</p>}
                </section>
                <div className="space-y-4">
                    <WeekStreak streak={d.stats.streak} week={d.week} />
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="mb-2 font-semibold text-slate-800">Insignias</h3>
                        <ul className="space-y-1 text-sm text-slate-700">{d.badges.map((b) => <li key={b.name + b.awarded_at}>🏆 {b.name}</li>)}{d.badges.length === 0 && <li className="text-slate-400">Sin insignias todavía</li>}</ul>
                    </div>
                </div>
            </div>

            <section>
                <h2 className="mb-3 font-semibold text-slate-800">Calificaciones recientes</h2>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Curso</th><th className="px-4 py-3">Evaluación</th><th className="px-4 py-3">Intento</th><th className="px-4 py-3">Nota</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {d.attempts.map((a, i) => (
                                <tr key={i}>
                                    <td className="px-4 py-3 text-slate-500">{formatDate(a.created_at)}</td><td className="px-4 py-3">{a.course}</td>
                                    <td className="px-4 py-3">{a.lesson} <span className="text-xs text-slate-400">({lessonTypeLabel(a.type)})</span></td><td className="px-4 py-3">#{a.attempt}</td>
                                    <td className="px-4 py-3"><Badge tone={a.passed ? 'green' : 'red'}>{a.score}%</Badge></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {d.attempts.length === 0 && <p className="px-6 py-10 text-center text-sm text-slate-400">Sin evaluaciones realizadas.</p>}
                </div>
            </section>
        </div>
    );
}