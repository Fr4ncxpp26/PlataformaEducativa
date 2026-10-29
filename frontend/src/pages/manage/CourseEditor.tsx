import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useApi } from '../../hooks/useApi';
import { Alert, Button, Spinner } from '../../components/ui';
import { Badge } from '../../components/admin/AdminUI';
import CourseForm from '../../components/course/CourseForm';
import CurriculumEditor from '../../components/course/CurriculumEditor';
import RewardsPanel from '../../components/course/RewardsPanel';
import StudentsPanel from '../../components/course/StudentsPanel';
import type { CourseFull } from '../../types/course';

const TABS = [
    { id: 'datos', label: 'Datos' },
    { id: 'contenido', label: 'Contenido' },
    { id: 'recompensas', label: 'Recompensas y certificados' },
    { id: 'alumnos', label: 'Alumnos' },
] as const;
type Tab = (typeof TABS)[number]['id'];

export default function CourseEditor() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isNew = id === 'nuevo';
    const { data, error, loading, reload } = useApi<{ data: CourseFull }>(isNew ? null : `/manage/courses/${id}`);

    const [tab, setTab] = useState<Tab>('datos');
    const [msg, setMsg] = useState('');
    const [isStudentPreview, setIsStudentPreview] = useState(false);

    const course = data?.data;
    const activeCourseId = course?.id ?? (isNew ? null : id);

    if (!isNew && !course && loading) return <Spinner />;
    if (!isNew && !course) return <Alert type="error">{error || 'Curso no encontrado'}</Alert>;

    const togglePublish = async () => {
        setMsg('');
        try {
            await api(`/manage/courses/${course!.id}`, { method: 'PATCH', body: { is_published: !course!.is_published } });
            reload();
        } catch (e) {
            setMsg(errorMessage(e));
        }
    };

    return (
        <div>
            {/* Barra superior de control */}
            <div className="sticky top-0 z-30 mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/95 px-5 py-3.5 backdrop-blur">
                <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <div>
                        <h2 className="text-sm font-semibold text-zinc-100">
                            {isStudentPreview ? 'Modo Vista Previa del Alumno Activo' : 'Editor de Curso (Modo Profesor)'}
                        </h2>
                        <p className="text-xs text-zinc-400">
                            {isStudentPreview
                                ? 'Estás visualizando las lecciones, PDFs y quizzes tal como los verá el estudiante.'
                                : 'Sube portadas, adjunta PDFs en el currículum y organiza tus módulos.'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {!isNew && (
                        <button
                            type="button"
                            onClick={() => setIsStudentPreview(!isStudentPreview)}
                            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${isStudentPreview
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                }`}
                        >
                            {isStudentPreview ? '← Volver al Editor' : '👁️ Vista Previa como Alumno'}
                        </button>
                    )}

                    {activeCourseId && (
                        <Link
                            to={`/learn/${activeCourseId}?preview=true`}
                            target="_blank"
                            className="rounded-lg bg-zinc-800 px-3.5 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
                        >
                            Abrir Reproductor Completo ↗
                        </Link>
                    )}
                </div>
            </div>

            {/* Renderizado condicional: Vista previa vs. Editor */}
            {isStudentPreview && activeCourseId ? (
                <div className="rounded-2xl border-2 border-emerald-500/40 bg-zinc-950 overflow-hidden shadow-2xl">
                    <div className="bg-emerald-950/50 px-4 py-2 text-xs text-emerald-300 flex justify-between items-center border-b border-emerald-500/20">
                        <span>Simulación de Estudiante en Tiempo Real</span>
                        <span>Los intentos de Quiz en esta vista no afectan las estadísticas reales</span>
                    </div>
                    <iframe
                        src={`/learn/${activeCourseId}?preview=true`}
                        title="Vista Previa Alumno"
                        className="w-full h-[78vh] border-0"
                    />
                </div>
            ) : (
                <>
                    <Link to="/gestion/cursos" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
                        <ArrowLeft size={14} /> Volver a cursos
                    </Link>

                    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-slate-800">{isNew ? 'Nuevo curso' : course!.title}</h1>
                            {course && <Badge tone={course.is_published ? 'green' : 'amber'}>{course.is_published ? 'Publicado' : 'Borrador'}</Badge>}
                        </div>
                        {course && (
                            <Button variant={course.is_published ? 'ghost' : 'primary'} onClick={togglePublish}>
                                {course.is_published ? 'Despublicar' : 'Publicar curso'}
                            </Button>
                        )}
                    </div>

                    {msg && <div className="mb-4"><Alert type="error">{msg}</Alert></div>}

                    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
                        {TABS.map((t) => (
                            <button
                                key={t.id}
                                disabled={isNew && t.id !== 'datos'}
                                onClick={() => setTab(t.id)}
                                className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${tab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {tab === 'datos' && (
                        <CourseForm
                            key={course?.id ?? 'new'}
                            course={course}
                            onSaved={(newId, created) => (created ? navigate(`/gestion/cursos/${newId}`, { replace: true }) : reload())}
                        />
                    )}
                    {course && tab === 'contenido' && <CurriculumEditor course={course} onChange={reload} />}
                    {course && tab === 'recompensas' && <RewardsPanel key={course.id} course={course} onChange={reload} />}
                    {course && tab === 'alumnos' && <StudentsPanel courseId={course.id} />}
                </>
            )}
        </div>
    );
}