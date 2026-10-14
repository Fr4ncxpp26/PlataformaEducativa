import { Link } from 'react-router-dom';
import { BookOpen, CalendarClock, Star, Trophy, Video } from 'lucide-react';
import { useApi } from '../../hooks/useapi';
import { useAuth } from '../../context/useAuth';
import { formatDay, formatTime } from '../../lib/format';
import { Alert, Spinner } from '../../components/ui';
import { StatCard } from '../../components/admin/AdminUI';
import WeekStreak from '../../components/student/WeekStreak';
import TutorWidget from '../../components/student/TutorWidget';
import CourseCard from '../../components/course/CourseCard';
import type { StudentDashboardData } from '../../types/learning';

const bar = (p: number) => <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-500 transition-all" style={{ width: `${p}%` }} /></div>;

export default function StudentDashboard() {
    const { user } = useAuth();
    const { data: d, error, loading, reload } = useApi<StudentDashboardData>('/learning/dashboard');
    if (!d) return error ? <Alert type="error">{error}</Alert> : loading ? <Spinner /> : null;

    const inProgress = d.courses.filter((c) => c.percent < 100 && c.course.is_published);
    const hero = inProgress.find((c) => c.percent > 0) ?? inProgress[0];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">¡Hola, {user?.nombre.split(' ')[0]}! 👋</h1>

            {hero ? (
                <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white shadow">
                    <p className="text-sm text-indigo-100">Continúa tu aprendizaje</p>
                    <h2 className="mt-1 text-xl font-bold">{hero.course.title}</h2>
                    <div className="mt-3 max-w-md"><div className="h-2 rounded-full bg-white/30"><div className="h-2 rounded-full bg-white" style={{ width: `${hero.percent}%` }} /></div>
                        <p className="mt-1 text-xs text-indigo-100">{hero.completed}/{hero.total} lecciones · {hero.percent}%</p></div>
                    <Link to={`/aprender/${hero.course.slug}`} className="mt-4 inline-block rounded-lg bg-white px-5 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">{hero.percent === 0 ? 'Empezar' : 'Retomar'}</Link>
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                    <p className="text-slate-600">Aún no tienes cursos en progreso.</p>
                    <Link to="/cursos" className="mt-2 inline-block text-sm font-semibold text-indigo-600">Explorar el catálogo →</Link>
                </div>
            )}

            <div className="grid gap-4 lg:grid-cols-3">
                <WeekStreak streak={d.stats.streak} week={d.week} />
                <StatCard label="Puntos" value={d.stats.points} icon={Star} tone="amber" hint={`${d.stats.lessons} lecciones completadas`} />
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">Insignias recientes</p><Trophy size={18} className="text-amber-500" /></div>
                    <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
                        {d.badges.map((b) => <li key={b.id}>🏆 {b.name}</li>)}
                        {d.badges.length === 0 && <li className="text-slate-400">Completa lecciones para ganar tu primera insignia</li>}
                    </ul>
                    <Link to="/logros" className="mt-3 inline-block text-sm font-medium text-indigo-600">Ver todos mis logros →</Link>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                <section className="space-y-3">
                    <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold text-slate-800"><BookOpen size={18} /> Mis cursos</h2><Link to="/mis-cursos" className="text-sm text-indigo-600">Ver todos</Link></div>
                    {d.courses.slice(0, 4).map((c) => (
                        <Link key={c.course.id} to={`/aprender/${c.course.slug}`} className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md">
                            <div className="mb-2 flex justify-between text-sm"><span className="font-medium text-slate-800">{c.course.title}</span><span className="text-slate-500">{c.percent}%</span></div>
                            {bar(c.percent)}
                        </Link>
                    ))}
                    {d.courses.length === 0 && <p className="text-sm text-slate-400">Inscríbete en un curso para ver tu progreso aquí.</p>}
                </section>

                <div className="space-y-4">
                    <TutorWidget tutors={d.tutors} onChange={reload} />
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 font-semibold text-slate-800"><CalendarClock size={18} /> Próximas tutorías</h3><Link to="/tutorias" className="text-sm text-indigo-600">Reservar</Link></div>
                        <ul className="space-y-2 text-sm">
                            {d.sessions.map((s) => (
                                <li key={s.id} className="flex items-center justify-between">
                                    <span className="text-slate-700">{formatDay(s.scheduled_at)} · {formatTime(s.scheduled_at)}<span className="block text-xs text-slate-400">con {s.teacher?.nombre ?? 'profesor'}</span></span>
                                    {s.meeting_url && <a href={s.meeting_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-600"><Video size={14} /> Unirme</a>}
                                </li>
                            ))}
                            {d.sessions.length === 0 && <li className="text-slate-400">No tienes tutorías programadas.</li>}
                        </ul>
                    </div>
                </div>
            </div>

            {d.suggested.length > 0 && (
                <section>
                    <h2 className="mb-3 font-semibold text-slate-800">Cursos recomendados</h2>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{d.suggested.map((c) => <CourseCard key={c.id} c={c} />)}</div>
                </section>
            )}
        </div>
    );
}