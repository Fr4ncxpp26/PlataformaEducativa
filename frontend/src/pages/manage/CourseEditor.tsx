import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { api, errorMessage } from '../../lib/api';
import { useApi } from '../../hooks/useApi';
import { Alert, Spinner } from '../../components/ui';
import { Badge } from '../../components/admin/AdminUI';
import CourseForm from '../../components/course/CourseForm';
import CurriculumEditor from '../../components/course/CurriculumEditor';
import RewardsPanel from '../../components/course/RewardsPanel';
import StudentsPanel from '../../components/course/StudentsPanel';
import type { CourseFull, CourseModule } from '../../types/course';

const TABS = [
    { id: 'datos', label: 'Datos' },
    { id: 'contenido', label: 'Contenido' },
    { id: 'recompensas', label: 'Recompensas y certificados' },
    { id: 'alumnos', label: 'Alumnos' },
] as const;

type Tab = (typeof TABS)[number]['id'];

interface CourseReadinessProps {
    course: CourseFull;
    modules: CourseModule[];
    onSelectTab: (tab: Tab) => void;
    onPublishToggle: () => void;
    isUpdatingPublication: boolean;
}

/** Barra de progreso de configuración y publicación del curso. */
function CourseReadinessBar({
    course,
    modules,
    onSelectTab,
    onPublishToggle,
    isUpdatingPublication,
}: CourseReadinessProps) {
    const checks = useMemo(() => {
        const hasBasicInfo = Boolean(
            course.title.trim() && course.description?.trim()
        );

        // En CourseFull la propiedad de portada se llama image_url.
        const hasCover = Boolean(course.image_url?.trim());

        const safeModules = Array.isArray(modules) ? modules : [];
        const hasModules = safeModules.length > 0;

        const totalLessons = safeModules.reduce((total, module) => {
            const lessonCount = Array.isArray(module?.lessons)
                ? module.lessons.length
                : 0;
            return total + lessonCount;
        }, 0);

        return [
            {
                id: 'info',
                label: 'Título y descripción',
                done: hasBasicInfo,
                tab: 'datos' as const,
            },
            {
                id: 'cover',
                label: 'Portada subida',
                done: hasCover,
                tab: 'datos' as const,
            },
            {
                id: 'modules',
                label: 'Módulos creados',
                done: hasModules,
                tab: 'contenido' as const,
            },
            {
                id: 'lessons',
                label: `Lecciones (${totalLessons})`,
                done: totalLessons > 0,
                tab: 'contenido' as const,
            },
        ];
    }, [course, modules]);

    const completedCount = checks.filter((check) => check.done).length;
    const progressPercent = checks.length > 0
        ? Math.round((completedCount / checks.length) * 100)
        : 0;
    const isReadyToPublish = completedCount === checks.length;
    const isPublished = Boolean(course.is_published);

    return (
        <section
            className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-lg"
            aria-label="Progreso de configuración del curso"
        >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                            Progreso de Configuración ({progressPercent}%)
                        </span>

                        {isPublished ? (
                            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                                ● Publicado
                            </span>
                        ) : (
                            <span className="rounded-full border border-amber-500/40 bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                                ● Borrador
                            </span>
                        )}
                    </div>

                    <p className="mt-0.5 text-xs text-zinc-400">
                        Haz clic en cualquier paso para ir directamente a completarlo.
                    </p>
                </div>

                <button
                    type="button"
                    disabled={(!isReadyToPublish && !isPublished) || isUpdatingPublication}
                    onClick={onPublishToggle}
                    className={`rounded-xl border px-4 py-2 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${isPublished
                            ? 'cursor-pointer border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                            : isReadyToPublish
                                ? 'cursor-pointer border-transparent bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400'
                                : 'cursor-not-allowed border-zinc-800 bg-zinc-800/60 text-zinc-500'
                        }`}
                >
                    {isUpdatingPublication
                        ? 'Guardando...'
                        : isPublished
                            ? 'Pasar a Borrador'
                            : isReadyToPublish
                                ? '🚀 Publicar Curso Ahora'
                                : 'Completa los 4 pasos para publicar'}
                </button>
            </div>

            <div
                className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800"
                role="progressbar"
                aria-label="Progreso de configuración"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPercent}
            >
                <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {checks.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectTab(item.tab)}
                        className={`flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition ${item.done
                                ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                                : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                            }`}
                    >
                        <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${item.done
                                    ? 'bg-emerald-500 text-zinc-950'
                                    : 'bg-zinc-800 text-zinc-400'
                                }`}
                            aria-hidden="true"
                        >
                            {item.done ? '✓' : '!'}
                        </span>
                        <span className="truncate font-medium">{item.label}</span>
                    </button>
                ))}
            </div>
        </section>
    );
}

export default function CourseEditor() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isNew = id === 'nuevo';

    const { data, error, loading, reload } = useApi<{ data: CourseFull }>(
        isNew ? null : `/manage/courses/${id}`
    );

    const [tab, setTab] = useState<Tab>('datos');
    const [msg, setMsg] = useState('');
    const [isStudentPreview, setIsStudentPreview] = useState(false);
    const [isUpdatingPublication, setIsUpdatingPublication] = useState(false);
    const [publishedOverride, setPublishedOverride] = useState<boolean | null>(null);

    const rawCourse = data?.data;

    // Normaliza los arreglos anidados para evitar errores de .map/.reduce
    // si la respuesta del servidor trae modules o lessons vacíos/no definidos.
    const modules = useMemo<CourseModule[]>(() => {
        const sourceModules = Array.isArray(rawCourse?.modules)
            ? rawCourse.modules
            : [];

        return sourceModules
            .filter((module): module is CourseModule => (
                module !== null &&
                typeof module === 'object' &&
                typeof module.id === 'string'
            ))
            .map((module) => ({
                ...module,
                lessons: Array.isArray(module.lessons)
                    ? module.lessons.filter((lesson) => (
                        lesson !== null &&
                        typeof lesson === 'object' &&
                        typeof lesson.id === 'string' &&
                        typeof lesson.title === 'string' &&
                        typeof lesson.type === 'string'
                    ))
                    : [],
            }));
    }, [rawCourse]);

    const course = useMemo<CourseFull | undefined>(() => {
        if (!rawCourse) return undefined;
        return { ...rawCourse, modules };
    }, [rawCourse, modules]);

    // Mantiene el estado visual correcto mientras useApi realiza la recarga.
    const displayedCourse = useMemo<CourseFull | undefined>(() => {
        if (!course || publishedOverride === null) return course;
        return { ...course, is_published: publishedOverride };
    }, [course, publishedOverride]);

    useEffect(() => {
        setPublishedOverride(null);
    }, [course?.id]);

    useEffect(() => {
        if (
            publishedOverride !== null &&
            course?.is_published === publishedOverride
        ) {
            setPublishedOverride(null);
        }
    }, [course?.is_published, publishedOverride]);

    const activeCourseId = displayedCourse?.id ?? (isNew ? null : id ?? null);

    const togglePublish = async (): Promise<void> => {
        if (!displayedCourse?.id || isUpdatingPublication) return;

        const nextPublishedState = !displayedCourse.is_published;
        setMsg('');
        setIsUpdatingPublication(true);

        try {
            await api(`/manage/courses/${displayedCourse.id}`, {
                method: 'PATCH',
                body: { is_published: nextPublishedState },
            });

            setPublishedOverride(nextPublishedState);
            // reload() solo dispara la recarga; no devuelve una promesa.
            reload();
        } catch (e) {
            setMsg(errorMessage(e));
        } finally {
            setIsUpdatingPublication(false);
        }
    };

    if (!isNew && !course && loading) {
        return <Spinner />;
    }

    if (!isNew && !course) {
        return <Alert type="error">{error || 'Curso no encontrado'}</Alert>;
    }

    return (
        <div>
            {/* Barra superior de control */}
            <div className="sticky top-0 z-30 mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/95 px-5 py-3.5 backdrop-blur">
                <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
                    <div>
                        <h2 className="text-sm font-semibold text-zinc-100">
                            {isStudentPreview
                                ? 'Modo Vista Previa del Alumno Activo'
                                : 'Editor de Curso (Modo Profesor)'}
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
                            onClick={() => setIsStudentPreview((previous) => !previous)}
                            className={`rounded-lg border px-4 py-2 text-xs font-semibold transition-all ${isStudentPreview
                                    ? 'border-amber-500/40 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                                    : 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                                }`}
                        >
                            {isStudentPreview
                                ? '← Volver al Editor'
                                : '👁️ Vista Previa como Alumno'}
                        </button>
                    )}

                    {activeCourseId && (
                        <Link
                            to={`/learn/${activeCourseId}?preview=true`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-zinc-800 px-3.5 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
                        >
                            Abrir Reproductor Completo ↗
                        </Link>
                    )}
                </div>
            </div>

            {/* Vista previa del alumno */}
            {isStudentPreview && activeCourseId ? (
                <div className="overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-zinc-950 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-emerald-500/20 bg-emerald-950/50 px-4 py-2 text-xs text-emerald-300">
                        <span>Simulación de Estudiante en Tiempo Real</span>
                        <span>
                            Los intentos de Quiz en esta vista no afectan las estadísticas reales
                        </span>
                    </div>
                    <iframe
                        src={`/learn/${activeCourseId}?preview=true`}
                        title="Vista Previa Alumno"
                        className="h-[78vh] w-full border-0"
                    />
                </div>
            ) : (
                <>
                    <Link
                        to="/gestion/cursos"
                        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600"
                    >
                        <ArrowLeft size={14} />
                        Volver a cursos
                    </Link>

                    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-slate-800">
                                {isNew ? 'Nuevo curso' : displayedCourse?.title}
                            </h1>
                            {displayedCourse && (
                                <Badge tone={displayedCourse.is_published ? 'green' : 'amber'}>
                                    {displayedCourse.is_published ? 'Publicado' : 'Borrador'}
                                </Badge>
                            )}
                        </div>
                    </div>

                    {(msg || (displayedCourse && error)) && (
                        <div className="mb-4">
                            <Alert type="error">{msg || error}</Alert>
                        </div>
                    )}

                    {/* Barra de preparación: solo aparece en cursos existentes */}
                    {displayedCourse && (
                        <CourseReadinessBar
                            course={displayedCourse}
                            modules={modules}
                            onSelectTab={setTab}
                            onPublishToggle={() => void togglePublish()}
                            isUpdatingPublication={isUpdatingPublication}
                        />
                    )}

                    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
                        {TABS.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                disabled={isNew && item.id !== 'datos'}
                                onClick={() => setTab(item.id)}
                                className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${tab === item.id
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {tab === 'datos' && (
                        <CourseForm
                            key={displayedCourse?.id ?? 'new'}
                            course={displayedCourse}
                            onSaved={(newId, created) => {
                                if (created) {
                                    navigate(`/gestion/cursos/${newId}`, { replace: true });
                                } else {
                                    reload();
                                }
                            }}
                        />
                    )}

                    {displayedCourse && tab === 'contenido' && (
                        <CurriculumEditor
                            course={displayedCourse}
                            onChange={reload}
                        />
                    )}

                    {displayedCourse && tab === 'recompensas' && (
                        <RewardsPanel
                            key={displayedCourse.id}
                            course={displayedCourse}
                            onChange={reload}
                        />
                    )}

                    {displayedCourse && tab === 'alumnos' && (
                        <StudentsPanel courseId={displayedCourse.id} />
                    )}
                </>
            )}
        </div>
    );
}
