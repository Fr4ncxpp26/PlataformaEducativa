import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Clock, Lock, PlayCircle } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useApi } from '../hooks/useapi';
import { useAuth } from '../context/useAuth';
import { LEVEL_OPTIONS } from '../lib/constants';
import { lessonTypeLabel } from '../lib/course';
import { formatMoney } from '../lib/format';
import { Alert, Button, Spinner } from '../components/ui';
import { Badge } from '../components/admin/AdminUI';
import type { CourseSummary, OutlineModule } from '../types/course';

interface Detail { course: CourseSummary & { completion_points: number }; modules: OutlineModule[] }
interface Mine { data: { course: { id: string } }[] }

export default function CourseDetail() {
    const { slug } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const isStudent = user?.rol === 'alumno_adulto' || user?.rol === 'alumno_menor';
    const detail = useApi<Detail>(`/public/courses/${slug}`);
    const mine = useApi<Mine>(isStudent ? '/learning/my-courses' : null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    if (!detail.data) return detail.error ? <Alert type="error">{detail.error}</Alert> : <Spinner />;
    const { course, modules } = detail.data;
    const enrolled = mine.data?.data.some((r) => r.course.id === course.id) ?? false;
    const free = Number(course.price) === 0;
    const lessons = modules.reduce((n, m) => n + m.lessons.length, 0);

    const enroll = async () => {
        setBusy(true);
        setError('');
        try {
            await api(`/learning/enroll/${course.id}`, { method: 'POST' });
            navigate(`/aprender/${course.slug}`);
        } catch (e) { setError(errorMessage(e)); setBusy(false); }
    };

    return (
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <div className="space-y-6">
                <div>
                    <Badge tone="indigo">{LEVEL_OPTIONS.find((l) => l.value === course.level)?.label ?? course.level}</Badge>
                    <h1 className="mt-2 text-3xl font-bold text-slate-800">{course.title}</h1>
                    <p className="mt-1 text-sm text-slate-500">{course.subject?.name ?? 'General'}{course.teacher ? ` · Profesor: ${course.teacher.nombre}` : ''}</p>
                </div>
                <p className="whitespace-pre-wrap text-slate-600">{course.description ?? 'Este curso aún no tiene descripción.'}</p>

                <section className="space-y-3">
                    <h2 className="text-lg font-semibold text-slate-800">Contenido del curso <span className="text-sm font-normal text-slate-400">({modules.length} módulos · {lessons} lecciones)</span></h2>
                    {modules.map((m) => (
                        <div key={m.id} className="rounded-xl border border-slate-200 bg-white">
                            <p className="border-b border-slate-100 px-4 py-3 font-medium text-slate-800">{m.title}</p>
                            <ul className="divide-y divide-slate-100">
                                {m.lessons.map((l) => (
                                    <li key={l.id} className="flex items-center justify-between px-4 py-2.5 text-sm text-slate-600">
                                        <span className="flex items-center gap-2">{l.is_free ? <PlayCircle size={16} className="text-green-600" /> : <Lock size={14} className="text-slate-400" />}{l.title}</span>
                                        <span className="flex items-center gap-2 text-xs text-slate-400">
                                            {lessonTypeLabel(l.type)}{l.duration_minutes ? <><Clock size={12} />{l.duration_minutes} min</> : null}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </section>
            </div>

            <aside className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
                {course.image_url && <img src={course.image_url} alt="" className="h-40 w-full rounded-lg object-cover" referrerPolicy="no-referrer" />}
                <p className="text-3xl font-bold text-slate-800">{free ? 'Gratis' : formatMoney(course.price)}</p>
                {error && <Alert type="error">{error}</Alert>}
                {!user ? (
                    <div className="space-y-2">
                        <Link to="/login" className="block rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-700">Inicia sesión para inscribirte</Link>
                        <Link to="/register" className="block rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50">Crear cuenta</Link>
                    </div>
                ) : !isStudent ? (
                    <p className="text-sm text-slate-500">Vista previa del curso. La inscripción es solo para cuentas de alumno.</p>
                ) : enrolled ? (
                    <Link to={`/aprender/${course.slug}`} className="block rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-700">Continuar aprendiendo</Link>
                ) : free ? (
                    <Button onClick={enroll} loading={busy} className="w-full">Inscribirme gratis</Button>
                ) : (
                    <Button disabled className="w-full">Compra disponible próximamente</Button>
                )}
                <ul className="space-y-1 text-xs text-slate-500">
                    <li>🎓 Certificado verificable al terminar</li>
                    <li>⭐ {course.completion_points} puntos de bono al completarlo</li>
                </ul>
            </aside>
        </div>
    );
}