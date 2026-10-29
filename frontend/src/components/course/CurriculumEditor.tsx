import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowDown, ArrowUp, HelpCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { LESSON_TYPE_OPTIONS, isQuizType, lessonTypeLabel } from '../../lib/course';
import { Alert, Button } from '../ui';
import { Badge, IconButton, Modal } from '../admin/AdminUI';
import FormModal, { buildPayload, initialValues, FieldsGrid } from '../admin/FormModal';
import type { FieldDef, Values } from '../admin/FormModal';
import type { CourseFull, CourseModule, Lesson, Question } from '../../types/course';
import { FileUploader } from '../FileUploader';

// --- ESQUEMAS DE CAMPOS ---
const moduleFields: FieldDef[] = [
    { name: 'title', label: 'Título del módulo', required: true },
    { name: 'is_published', label: 'Publicado (visible para los alumnos)', type: 'checkbox' },
];

const lessonFields: FieldDef[] = [
    { name: 'title', label: 'Título de la lección', required: true },
    { name: 'type', label: 'Tipo de contenido', type: 'select', required: true, options: LESSON_TYPE_OPTIONS },
    { name: 'content_url', label: 'URL del recurso (video, PDF o actividad)', type: 'url' },
    { name: 'attachment_url', label: 'Material descargable', type: 'url' },
    { name: 'duration_minutes', label: 'Duración (minutos)', type: 'number' },
    { name: 'points', label: 'Puntos al completarla', type: 'number', required: true },
    { name: 'pass_score', label: 'Nota mínima para aprobar (%)', type: 'number' },
    { name: 'max_attempts', label: 'Intentos máximos', type: 'number' },
    { name: 'text_content', label: 'Texto de la lección (lectura / apoyo)', type: 'textarea' },
    { name: 'is_free', label: 'Vista previa gratuita', type: 'checkbox' },
    { name: 'is_published', label: 'Publicada', type: 'checkbox' },
];

// --- SUB-COMPONENTE: FORMULARIO DE PREGUNTAS ---
interface OptDraft { text: string; is_correct: boolean; }

function QuestionForm({ lessonId, question, onDone, onCancel }: { lessonId: string; question?: Question; onDone: () => void; onCancel: () => void; }) {
    const [prompt, setPrompt] = useState(question?.prompt ?? '');
    const [explanation, setExplanation] = useState(question?.explanation ?? '');
    const [options, setOptions] = useState<OptDraft[]>(
        question?.options.map((o) => ({ text: o.text, is_correct: o.is_correct })) ?? [
            { text: '', is_correct: true },
            { text: '', is_correct: false },
        ]
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const setOpt = (idx: number, patch: Partial<OptDraft>) => {
        setOptions((prev) => prev.map((opt, i) => (i === idx ? { ...opt, ...patch } : opt)));
    };

    const submit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        const body = { prompt, explanation: explanation.trim() || null, options };
        try {
            if (question) {
                await api(`/manage/questions/${question.id}`, { method: 'PATCH', body });
            } else {
                await api(`/manage/lessons/${lessonId}/questions`, { method: 'POST', body });
            }
            onDone();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            {error && <Alert type="error">{error}</Alert>}
            <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Pregunta</span>
                <input required value={prompt} onChange={(e) => setPrompt(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
            </label>

            <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Opciones (marca la respuesta correcta)</p>
                {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <input type="radio" name="correct" aria-label={`Marcar opción ${index + 1} como correcta`} checked={option.is_correct}
                            onChange={() => setOptions((prev) => prev.map((item, i) => ({ ...item, is_correct: i === index })))} />
                        <input required value={option.text} onChange={(e) => setOpt(index, { text: e.target.value })} placeholder={`Opción ${index + 1}`} className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-indigo-500" />
                        <IconButton title="Quitar opción" danger disabled={options.length <= 2}
                            onClick={() => setOptions((prev) => {
                                const next = prev.filter((_, i) => i !== index);
                                if (!next.some((item) => item.is_correct)) next[0].is_correct = true;
                                return next;
                            })}>
                            <Trash2 size={15} />
                        </IconButton>
                    </div>
                ))}
                {options.length < 6 && (
                    <button type="button" className="text-sm font-medium text-indigo-600" onClick={() => setOptions((prev) => [...prev, { text: '', is_correct: false }])}>
                        + Añadir opción
                    </button>
                )}
            </div>

            <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Explicación (se muestra si el alumno falla)</span>
                <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
            </label>

            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
                <Button type="submit" loading={saving}>{question ? 'Guardar pregunta' : 'Añadir pregunta'}</Button>
            </div>
        </form>
    );
}

// --- SUB-COMPONENTE: MODAL DE GESTIÓN DE PREGUNTAS ---
function QuestionsModal({ course, lessonId, onClose, onChange }: { course: CourseFull; lessonId: string; onClose: () => void; onChange: () => void; }) {
    const lesson = course.modules.flatMap((m) => m.lessons).find((item) => item.id === lessonId);
    const [editing, setEditing] = useState<Question | 'new' | null>(null);
    const [error, setError] = useState('');

    const remove = async (q: Question) => {
        if (!window.confirm('¿Eliminar esta pregunta?')) return;
        try {
            setError('');
            await api(`/manage/questions/${q.id}`, { method: 'DELETE' });
            onChange();
        } catch (err) {
            setError(errorMessage(err));
        }
    };

    if (!lesson) return null;

    return (
        <Modal title={`Preguntas: ${lesson.title}`} onClose={onClose} wide>
            <div className="space-y-4">
                {error && <Alert type="error">{error}</Alert>}
                {(lesson.questions ?? []).map((q, index) => (
                    <div key={q.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-slate-800">{index + 1}. {q.prompt}</p>
                            <div className="flex">
                                <IconButton title="Editar pregunta" onClick={() => setEditing(q)}><Pencil size={15} /></IconButton>
                                <IconButton title="Eliminar pregunta" danger onClick={() => void remove(q)}><Trash2 size={15} /></IconButton>
                            </div>
                        </div>
                        <ul className="mt-2 space-y-1 text-sm">
                            {q.options.map((opt) => (
                                <li key={opt.id} className={opt.is_correct ? 'font-medium text-green-700' : 'text-slate-600'}>
                                    {opt.is_correct ? '✓' : '○'} {opt.text}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}

                {(lesson.questions ?? []).length === 0 && editing === null && (
                    <p className="text-sm text-slate-400">Este quiz aún no tiene preguntas.</p>
                )}

                {editing !== null ? (
                    <QuestionForm key={editing === 'new' ? 'new' : editing.id} lessonId={lessonId} question={editing === 'new' ? undefined : editing} onCancel={() => setEditing(null)} onDone={() => { setEditing(null); onChange(); }} />
                ) : (
                    <Button onClick={() => setEditing('new')}>
                        <span className="flex items-center gap-1"><Plus size={16} /> Nueva pregunta</span>
                    </Button>
                )}
            </div>
        </Modal>
    );
}

// --- SUB-COMPONENTE: MODAL DE EDICIÓN DE LECCIONES ---
function LessonEditorModal({ moduleId, lesson, onClose, onSaved }: { moduleId: string; lesson?: Lesson; onClose: () => void; onSaved: () => void; }) {
    const lessonRecord = lesson as (Record<string, unknown> & { id: string }) | undefined;
    const initialLesson = lessonRecord ? { ...lessonRecord, attachment_url: lessonRecord.attachment_url ?? lessonRecord.resource_url ?? '' } : undefined;

    const [values, setValues] = useState<Values>(() =>
        initialValues(lessonFields, initialLesson as Record<string, unknown> | undefined, {
            is_published: true, points: '10', type: 'video', attachment_url: '',
        } as Values)
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const set = (name: string, value: string | boolean) => setValues((prev) => ({ ...prev, [name]: value }));
    const attachmentUrl = typeof values.attachment_url === 'string' ? values.attachment_url : '';

    const submit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            const mode = lesson ? 'edit' : 'create';
            const body = buildPayload(lessonFields, values, mode);
            if (lesson) {
                await api(`/manage/lessons/${lesson.id}`, { method: 'PATCH', body });
            } else {
                await api(`/manage/modules/${moduleId}/lessons`, { method: 'POST', body });
            }
            onSaved();
            onClose();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title={lesson ? 'Editar lección' : 'Nueva lección'} onClose={onClose} wide>
            <form onSubmit={submit} className="space-y-4">
                {error && <Alert type="error">{error}</Alert>}
                <FieldsGrid fields={lessonFields.filter((f) => f.name !== 'attachment_url')} values={values} set={set} />
                <div className="mt-4 border-t border-slate-200 pt-4">
                    <FileUploader
                        label="Material de estudio adjunto (PDF o imagen)"
                        folder="courses/pdfs"
                        accept="both"
                        value={attachmentUrl}
                        helperText="Sube una guía en PDF, ejercicios o diagramas para que el alumno pueda consultarlos o imprimirlos."
                        onChange={(url) => set('attachment_url', url)}
                    />
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" loading={saving}>{lesson ? 'Guardar cambios' : 'Crear lección'}</Button>
                </div>
            </form>
        </Modal>
    );
}

// --- TIPOS MODALES ---
type ModuleModal = { mode: 'create' } | { mode: 'edit'; mod: CourseModule } | null;
type LessonModal = { moduleId: string; lesson?: Lesson } | null;

// --- COMPONENTE PRINCIPAL ---
export default function CurriculumEditor({ course, onChange }: { course: CourseFull; onChange: () => void; }) {
    const [moduleModal, setModuleModal] = useState<ModuleModal>(null);
    const [lessonModal, setLessonModal] = useState<LessonModal>(null);
    const [questionsFor, setQuestionsFor] = useState<string | null>(null);
    const [error, setError] = useState('');

    const run = async (fn: () => Promise<unknown>) => {
        setError('');
        try {
            await fn();
            onChange();
        } catch (err) {
            setError(errorMessage(err));
        }
    };

    const addUnit = async () => {
        const title = window.prompt('Nombre de la unidad (ej. Unidad 1: Fracciones)');
        if (!title?.trim()) return;

        await run(async () => {
            const res = await api<{ data: { id: string } }>(`/manage/courses/${course.id}/modules`, {
                method: 'POST', body: { title: title.trim() },
            });
            const lessons = [
                { title: 'Lectura', type: 'lectura' },
                { title: 'Material descargable', type: 'pdf' },
                { title: 'Ejercicios de práctica', type: 'ejercicio' },
                { title: 'Examen de la unidad', type: 'examen_unidad', pass_score: 70, max_attempts: 3 },
            ];
            for (const item of lessons) {
                await api(`/manage/modules/${res.data.id}/lessons`, {
                    method: 'POST', body: { ...item, is_published: false },
                });
            }
        });
    };

    const addFinalExam = () => run(async () => {
        const res = await api<{ data: { id: string } }>(`/manage/courses/${course.id}/modules`, {
            method: 'POST', body: { title: 'Evaluación final' },
        });
        await api(`/manage/modules/${res.data.id}/lessons`, {
            method: 'POST',
            body: { title: 'Examen final', type: 'examen_final', points: 50, pass_score: 70, max_attempts: 2, is_published: false },
        });
    });

    const move = (kind: 'modules' | 'lessons', id: string, direction: 'up' | 'down') =>
        run(() => api(`/manage/${kind}/${id}/move`, { method: 'POST', body: { direction } }));

    const remove = (kind: 'modules' | 'lessons', id: string, label: string, warning: string) => {
        if (window.confirm(`¿Eliminar "${label}"? ${warning}`)) {
            void run(() => api(`/manage/${kind}/${id}`, { method: 'DELETE' }));
        }
    };

    return (
        <div className="space-y-4">
            {error && <Alert type="error">{error}</Alert>}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">Curso → Unidades → Lecciones → examen de unidad → examen final. Los contenidos ocultos no los ven los alumnos.</p>
                <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" onClick={addFinalExam}>+ Examen final</Button>
                    <Button variant="ghost" onClick={addUnit}>+ Unidad con plantilla</Button>
                    <Button onClick={() => setModuleModal({ mode: 'create' })}>
                        <span className="flex items-center gap-1"><Plus size={16} /> Módulo vacío</span>
                    </Button>
                </div>
            </div>

            {course.modules.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
                    Aún no hay módulos. Crea el primero para empezar.
                </div>
            )}

            {course.modules.map((module, mIdx) => (
                <section key={module.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase text-slate-400">Módulo {mIdx + 1}</span>
                            <h3 className="font-semibold text-slate-800">{module.title}</h3>
                            {!module.is_published && <Badge tone="amber">Oculto</Badge>}
                        </div>
                        <div className="flex flex-wrap items-center">
                            <IconButton title="Subir módulo" disabled={mIdx === 0} onClick={() => move('modules', module.id, 'up')}><ArrowUp size={16} /></IconButton>
                            <IconButton title="Bajar módulo" disabled={mIdx === course.modules.length - 1} onClick={() => move('modules', module.id, 'down')}><ArrowDown size={16} /></IconButton>
                            <IconButton title="Editar módulo" onClick={() => setModuleModal({ mode: 'edit', mod: module })}><Pencil size={16} /></IconButton>
                            <IconButton title="Eliminar módulo" danger onClick={() => remove('modules', module.id, module.title, 'Se borrarán sus lecciones, preguntas y el progreso de los alumnos.')}><Trash2 size={16} /></IconButton>
                            <Button variant="ghost" onClick={() => setLessonModal({ moduleId: module.id })}>
                                <span className="flex items-center gap-1"><Plus size={14} /> Lección</span>
                            </Button>
                        </div>
                    </div>

                    <ul className="divide-y divide-slate-100">
                        {module.lessons.map((lesson, lIdx) => (
                            <li key={lesson.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-slate-400">{lIdx + 1}.</span>
                                    <span className="font-medium text-slate-700">{lesson.title}</span>
                                    <Badge tone="blue">{lessonTypeLabel(lesson.type)}</Badge>
                                    {lesson.is_free && <Badge tone="green">Gratis</Badge>}
                                    {!lesson.is_published && <Badge tone="amber">Oculta</Badge>}
                                    <span className="text-xs text-slate-400">
                                        {lesson.points} pts{lesson.duration_minutes ? ` · ${lesson.duration_minutes} min` : ''}
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center">
                                    {isQuizType(lesson.type) && (
                                        <button type="button" className="mr-2 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50" onClick={() => setQuestionsFor(lesson.id)}>
                                            <HelpCircle size={14} /> Preguntas ({lesson.questions?.length ?? 0})
                                        </button>
                                    )}
                                    <IconButton title="Subir lección" disabled={lIdx === 0} onClick={() => move('lessons', lesson.id, 'up')}><ArrowUp size={15} /></IconButton>
                                    <IconButton title="Bajar lección" disabled={lIdx === module.lessons.length - 1} onClick={() => move('lessons', lesson.id, 'down')}><ArrowDown size={15} /></IconButton>
                                    <IconButton title="Editar lección y material" onClick={() => setLessonModal({ moduleId: module.id, lesson })}><Pencil size={15} /></IconButton>
                                    <IconButton title="Eliminar lección" danger onClick={() => remove('lessons', lesson.id, lesson.title, 'Se borrará también el progreso de los alumnos.')}><Trash2 size={15} /></IconButton>
                                </div>
                            </li>
                        ))}
                        {module.lessons.length === 0 && (
                            <li className="px-4 py-4 text-sm text-slate-400">Sin lecciones todavía.</li>
                        )}
                    </ul>
                </section>
            ))}

            {moduleModal && (
                <FormModal
                    title={moduleModal.mode === 'create' ? 'Nuevo módulo' : 'Editar módulo'}
                    fields={moduleFields}
                    initial={initialValues(moduleFields, moduleModal.mode === 'edit' ? (moduleModal.mod as unknown as Record<string, unknown>) : undefined, { is_published: true } as Values)}
                    submitLabel="Guardar"
                    onClose={() => setModuleModal(null)}
                    onSubmit={async (val) => {
                        const body = buildPayload(moduleFields, val, moduleModal.mode);
                        if (moduleModal.mode === 'create') {
                            await api(`/manage/courses/${course.id}/modules`, { method: 'POST', body });
                        } else {
                            await api(`/manage/modules/${moduleModal.mod.id}`, { method: 'PATCH', body });
                        }
                        setModuleModal(null);
                        onChange();
                    }}
                />
            )}

            {lessonModal && (
                <LessonEditorModal
                    key={lessonModal.lesson?.id ?? lessonModal.moduleId}
                    moduleId={lessonModal.moduleId}
                    lesson={lessonModal.lesson}
                    onClose={() => setLessonModal(null)}
                    onSaved={onChange}
                />
            )}

            {questionsFor && (
                <QuestionsModal course={course} lessonId={questionsFor} onClose={() => setQuestionsFor(null)} onChange={onChange} />
            )}
        </div>
    );
}