import { Link } from 'react-router-dom';
import { Award, Lock, Star, Trophy } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { formatDate } from '../lib/format';
import { PageHeader, StatCard } from '../components/admin/AdminUI';
import { Alert, Spinner } from '../components/ui';
import WeekStreak from '../components/student/WeekStreak';
import type { GamificationData } from '../types/learning';

interface Certs { data: { id: string; issue_date: string; course: { title: string } }[] }
const UNIT: Record<string, string> = { points: 'puntos', streak: 'días de racha', lessons: 'lecciones', courses: 'cursos', perfect_score: 'exámenes perfectos' };

export default function Achievements() {
    const g = useApi<GamificationData>('/learning/gamification');
    const c = useApi<Certs>('/learning/certificates');
    if (!g.data && g.loading) return <Spinner />;
    const d = g.data;
    const courseBadges = (d?.earned ?? []).filter((e) => e.achievement.course);

    return (
        <div className="space-y-8">
            <PageHeader title="Logros y certificados" subtitle="Tu progreso, tus insignias y tus constancias" />
            {(g.error || c.error) && <Alert type="error">{g.error || c.error}</Alert>}

            {d && (
                <div className="grid gap-4 lg:grid-cols-3">
                    <WeekStreak streak={d.stats.streak} week={d.week} />
                    <StatCard label="Puntos totales" value={d.stats.points} icon={Star} tone="amber" hint={`${d.stats.lessons} lecciones completadas`} />
                    <StatCard label="Mejor racha" value={`${d.stats.maxStreak} días`} icon={Trophy} tone="purple" hint={`${d.stats.courses} certificados`} />
                </div>
            )}

            <section>
                <h2 className="mb-3 text-lg font-semibold text-slate-800">Insignias</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {(d?.catalog ?? []).map((b) => (
                        <div key={b.id} className={`rounded-xl border p-4 ${b.earned ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                            <div className="flex items-center justify-between">
                                <p className={`font-semibold ${b.earned ? 'text-amber-900' : 'text-slate-500'}`}>{b.earned ? '🏆' : <Lock size={14} className="mr-1 inline" />} {b.name}</p>
                                {b.earned && <span className="text-xs font-medium text-amber-700">Obtenida</span>}
                            </div>
                            {b.description && <p className="text-sm text-slate-500">{b.description}</p>}
                            {!b.earned && (
                                <div className="mt-2">
                                    <div className="h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-indigo-400" style={{ width: `${Math.round((b.value / b.threshold) * 100)}%` }} /></div>
                                    <p className="mt-1 text-xs text-slate-400">{b.value}/{b.threshold} {UNIT[b.trigger_type] ?? ''}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                {courseBadges.length > 0 && (
                    <>
                        <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-600">Insignias de cursos</h3>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {courseBadges.map((e) => (
                                <div key={e.achievement.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                    <p className="font-semibold text-amber-900">🏆 {e.achievement.name}</p>
                                    <p className="text-xs text-amber-700/70">{e.achievement.course?.title} · {formatDate(e.awarded_at)}</p>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </section>

            <section>
                <h2 className="mb-3 text-lg font-semibold text-slate-800">Certificados</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                    {(c.data?.data ?? []).map((x) => (
                        <Link key={x.id} to={`/verificar/${x.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md">
                            <Award className="text-indigo-600" />
                            <div><p className="font-medium text-slate-800">{x.course.title}</p><p className="text-xs text-slate-400">Emitido {formatDate(x.issue_date)}</p></div>
                        </Link>
                    ))}
                    {(c.data?.data ?? []).length === 0 && <p className="text-sm text-slate-400">Termina un curso (incluido su examen final) para obtener tu primer certificado.</p>}
                </div>
            </section>
        </div>
    );
}