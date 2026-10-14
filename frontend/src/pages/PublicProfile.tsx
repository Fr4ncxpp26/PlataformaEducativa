import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Award, BookOpen, Eye, Flame, GraduationCap, Star, Trophy } from 'lucide-react';
import { useApi } from '../hooks/useapi';
import { formatDate } from '../lib/format';
import { LEVEL_OPTIONS } from '../lib/constants';
import { Alert, Avatar, Spinner } from '../components/ui';
import { Badge, StatCard } from '../components/admin/AdminUI';
import type { PublicProfileData } from '../types/community';
 
export default function PublicProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: d, error, loading } = useApi<PublicProfileData>(`/community/users/${id}`);
    if (!d) return error ? <div className="space-y-3"><Alert type="error">{error}</Alert><button onClick={() => navigate(-1)} className="text-sm font-semibold text-indigo-600">← Volver</button></div> : loading ? <Spinner /> : null;
    const p = d.profile;
 
    return (
        <div className="space-y-6">
            <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600"><ArrowLeft size={14} /> Volver</button>
            {d.preview && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <Eye size={16} /> Así te verían los demás si activas “Aparecer en rankings”. Ahora solo tú puedes ver esta página.
                    <Link to="/dashboard/perfil?tab=privacidad" className="ml-auto font-semibold underline">Configurar</Link>
                </div>
            )}
 
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="h-24 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500" />
                <div className="px-6 pb-6">
                    <div className="-mt-10 flex flex-wrap items-end gap-4">
                        <div className="rounded-full border-4 border-white bg-white shadow"><Avatar nombre={p.nombre} url={p.avatar_url} size="h-20 w-20 text-3xl" /></div>
                        <div className="min-w-0 flex-1 pb-1">
                            <h1 className="truncate text-2xl font-bold text-slate-800">{p.nombre}</h1>
                            <p className="text-sm text-slate-500">{p.headline ?? (d.kind === 'teacher' ? 'Profesor' : d.kind === 'student' ? 'Alumno' : '')}</p>
                        </div>
                        <Badge tone={d.kind === 'teacher' ? 'purple' : 'indigo'}>{d.kind === 'teacher' ? 'Profesor' : 'Alumno'}</Badge>
                    </div>
                    {p.bio && <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm text-slate-600">{p.bio}</p>}
                </div>
            </section>
 
            {d.kind === 'student' && (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard label="Puntos" value={d.stats.points} icon={Star} tone="amber" />
                        <StatCard label="Racha actual" value={`${d.stats.streak} días`} icon={Flame} tone="red" hint={`Mejor: ${d.stats.maxStreak} días`} />
                        <StatCard label="Lecciones" value={d.stats.lessons} icon={BookOpen} tone="blue" />
                        <StatCard label="Certificados" value={d.stats.certificates} icon={GraduationCap} tone="green" />
                    </div>
                    <div className="grid gap-6 lg:grid-cols-2">
                        <section className="space-y-3">
                            <h2 className="font-semibold text-slate-800">Cursos que está tomando</h2>
                            {d.courses.map((c) => (
                                <Link key={c.slug} to={`/cursos/${c.slug}`} className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md">
                                    <div className="mb-2 flex justify-between text-sm"><span className="font-medium text-slate-800">{c.title}</span><span className="text-slate-500">{c.percent}%</span></div>
                                    <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${c.percent}%` }} /></div>
                                </Link>
                            ))}
                            {d.courses.length === 0 && <p className="text-sm text-slate-400">Aún no está inscrito en cursos.</p>}
                        </section>
                        <div className="space-y-6">
                            <section className="space-y-3">
                                <h2 className="font-semibold text-slate-800">Certificados</h2>
                                {d.certificates.map((c) => (
                                    <Link key={c.id} to={`/verificar/${c.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md">
                                        <Award className="text-indigo-600" /><div><p className="text-sm font-medium text-slate-800">{c.course}</p><p className="text-xs text-slate-400">Emitido {formatDate(c.issue_date)}</p></div>
                                    </Link>
                                ))}
                                {d.certificates.length === 0 && <p className="text-sm text-slate-400">Aún no tiene certificados.</p>}
                            </section>
                            <section>
                                <h2 className="mb-2 flex items-center gap-2 font-semibold text-slate-800"><Trophy size={16} className="text-amber-500" /> Insignias</h2>
                                <div className="flex flex-wrap gap-2">
                                    {d.badges.map((b) => <span key={b.id} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200">🏆 {b.name}</span>)}
                                    {d.badges.length === 0 && <p className="text-sm text-slate-400">Sin insignias todavía.</p>}
                                </div>
                            </section>
                        </div>
                    </div>
                </>
            )}
 
            {d.kind === 'teacher' && (
                <section className="space-y-3">
                    <h2 className="font-semibold text-slate-800">Cursos que imparte</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {d.courses.map((c) => (
                            <Link key={c.id} to={`/cursos/${c.slug}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md">
                                <p className="font-medium text-slate-800">{c.title}</p>
                                <p className="mt-1 text-xs text-slate-400">{LEVEL_OPTIONS.find((l) => l.value === c.level)?.label ?? c.level} · {c.students} alumnos</p>
                            </Link>
                        ))}
                    </div>
                    {d.courses.length === 0 && <p className="text-sm text-slate-400">Aún no tiene cursos publicados.</p>}
                </section>
            )}
        </div>
    );
}
 