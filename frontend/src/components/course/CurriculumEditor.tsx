import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowDown, ArrowUp, HelpCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { LESSON_TYPE_OPTIONS, isQuizType, lessonTypeLabel } from '../../lib/course';
import { Alert, Button, Field } from '../ui';
import { Badge, IconButton, Modal, TextAreaField } from '../admin/AdminUI';
import FormModal, { buildPayload, initialValues } from '../admin/FormModal';
import type { FieldDef, Values } from '../admin/FormModal';
import type { CourseFull, CourseModule, Lesson, Question } from '../../types/course';

const moduleFields: FieldDef[] = [
    { name: 'title', label: 'Título del módulo', required: true },
    { name: 'is_published', label: 'Publicado (visible para los alumnos)', type: 'checkbox' },
];
const lessonFields: FieldDef[] = [
    { name: 'title', label: 'Título de la lección', required: true },
    { name: 'type', label: 'Tipo de contenido', type: 'select', required: true, options: LESSON_TYPE_OPTIONS },
    { name: 'content_url', label: 'URL del recurso (video, PDF, actividad) — https', type: 'url' },
    { name: 'duration_minutes', label: 'Duración (min)', type: 'number' },
    { name: 'points', label: 'Puntos al completarla', type: 'number', required: true },
    { name: 'pass_score', label: 'Nota mínima para aprobar % (exámenes; vacío = la del curso)', type: 'number' },
    { name: 'max_attempts', label: 'Intentos máximos (vacío = ilimitados)', type: 'number' },
    { name: 'text_content', label: 'Texto de la lección (lectura / apoyo)', type: 'textarea' },
    { name: 'is_free', label: 'Vista previa gratuita', type: 'checkbox' },
    { name: 'is_published', label: 'Publicada', type: 'checkbox' },
];

// ---------- Preguntas de un quiz ----------
interface OptDraft { text: string; is_correct: boolean }

function QuestionForm({ lessonId, question, onDone, onCancel }: { lessonId: string; question?: Question; onDone: () => void; onCancel: () => void }) {
    const [prompt, setPrompt] = useState(question?.prompt ?? '');
    const [explanation, setExplanation] = useState(question?.explanation ?? '');
    const [options, setOptions] = useState<OptDraft[]>(
        question?.options.map((o) => ({ text: o.text, is_correct: o.is_correct }))
        ?? [{ text: '', is_correct: true }, { text: '', is_correct: false }],
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const setOpt = (i: number, patch: Partial<OptDraft>) => setOptions((o) => o.map((x, j) => (j === i ? { ...x, ...patch } : x)));

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        const body = { prompt, explanation: explanation.trim() || null, options };
        try {
            if (question) await api(`/manage/questions/${question.id}`, { method: 'PATCH', body });
            else await api(`/manage/lessons/${lessonId}/questions`, { method: 'POST', body });
            onDone();
        } catch (err) {
            setError(errorMessage(err));
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            {error && <Alert type="error">{error}</Alert>}
            <Field label="Pregunta" required value={prompt} onChange={(e) => setPrompt(e.target.value)} />
            <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Opciones (marca la correcta)</p>
                {options.map((o, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <input type="radio" name="correct" checked={o.is_correct} onChange={() => setOptions((arr) => arr.map((x, j) => ({ ...x, is_correct: j === i })))} />
                        <input
                            required value={o.text} onChange={(e) => setOpt(i, { text: e.target.value })} placeholder={`Opción ${i + 1}`}
                            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
                        />
                        <IconButton title="Quitar opción" danger disabled={options.length <= 2}
                            onClick={() => setOptions((arr) => { const next = arr.filter((_, j) => j !== i); if (!next.some((x) => x.is_correct)) next[0].is_correct = true; return next; })}>
                            <Trash2 size={15} />
                        </IconButton>
                    </div>
                ))}
                {options.length < 6 && (
                    <button type="button" className="text-sm font-medium text-indigo-600" onClick={() => setOptions((o) => [...o, { text: '', is_correct: false }])}>+ Añadir opción</button>
                )}
            </div>
            <TextAreaField label="Explicación (se muestra si el alumno falla)" value={explanation} onChange={(e) => setExplanation(e.target.value)} />
            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
                <Button type="submit" loading={saving}>{question ? 'Guardar pregunta' : 'Añadir pregunta'}</Button>
            </div>
        </form>
    );
}

function QuestionsModal({ course, lessonId, onClose, onChange }: { course: CourseFull; lessonId: string; onClose: () => void; onChange: () => void }) {
    const lesson = course.modules.flatMap((m) => m.lessons).find((l) => l.id === lessonId);
    const [editing, setEditing] = useState<Question | 'new' | null>(null);
    const [error, setError] = useState('');
    if (!lesson) return null;

    const remove = async (q: Question) => {
        if (!window.confirm('¿Eliminar esta pregunta?')) return;
        try { await api(`/manage/questions/${q.id}`, { method: 'DELETE' }); onChange(); }
        catch (e) { setError(errorMessage(e)); }
    };

    return (
        <Modal title={`Preguntas: ${lesson.title}`} onClose={onClose} wide>
            <div className="space-y-4">
                {error && <Alert type="error">{error}</Alert>}
                {(lesson.questions ?? []).map((q, i) => (
                    <div key={q.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-slate-800">{i + 1}. {q.prompt}</p>
                            <div className="flex">
                                <IconButton title="Editar" onClick={() => setEditing(q)}><Pencil size={15} /></IconButton>
                                <IconButton title="Eliminar" danger onClick={() => remove(q)}><Trash2 size={15} /></IconButton>
                            </div>
                        </div>
                        <ul className="mt-2 space-y-1 text-sm">
                            {q.options.map((o) => (
                                <li key={o.id} className={o.is_correct ? 'font-medium text-green-700' : 'text-slate-600'}>{o.is_correct ? '✓' : '○'} {o.text}</li>
                            ))}
                        </ul>
                    </div>
                ))}
                {(lesson.questions ?? []).length === 0 && editing === null && <p className="text-sm text-slate-400">Este quiz aún no tiene preguntas.</p>}

                {editing ? (
                    <QuestionForm
                        key={editing === 'new' ? 'new' : editing.id} lessonId={lessonId} question={editing === 'new' ? undefined : editing}
                        onCancel={() => setEditing(null)} onDone={() => { setEditing(null); onChange(); }}
                    />
                ) : (
                    <Button onClick={() => setEditing('new')}><span className="flex items-center gap-1"><Plus size={16} /> Nueva pregunta</span></Button>
                )}
            </div>
        </Modal>
    );
}

// ---------- Editor de módulos y lecciones ----------
type ModuleModal = { mode: 'create' } | { mode: 'edit'; mod: CourseModule } | null;
type LessonModal = { moduleId: string; lesson?: Lesson } | null;

export default function CurriculumEditor({ course, onChange }: { course: CourseFull; onChange: () => void }) {
    const [moduleModal, setModuleModal] = useState<ModuleModal>(null);
    const [lessonModal, setLessonModal] = useState<LessonModal>(null);
    const [questionsFor, setQuestionsFor] = useState<string | null>(null);
    const [error, setError] = useState('');

    const run = async (fn: () => Promise<unknown>) => {
        setError('');
        try { await fn(); onChange(); } catch (e) { setError(errorMessage(e)); }
    };
    // Plantillas: crean la estructura y las lecciones quedan ocultas hasta que el profesor las complete y publique
    const addUnit = async () => {
        const title = window.prompt('Nombre de la unidad (ej. Unidad 1: Fracciones)');
        if (!title) return;
        await run(async () => {
            const r = await api<{ data: { id: string } }>(`/manage/courses/${course.id}/modules`, { method: 'POST', body: { title } });
            const lessons = [
                { title: 'Lectura', type: 'lectura' }, { title: 'Material descargable', type: 'pdf' },
                { title: 'Ejercicios de práctica', type: 'ejercicio' },
                { title: 'Examen de la unidad', type: 'examen_unidad', pass_score: 70, max_attempts: 3 },
            ];
            for (const l of lessons) await api(`/manage/modules/${r.data.id}/lessons`, { method: 'POST', body: { ...l, is_published: false } });
        });
    };
    const addFinalExam = () => run(async () => {
        const r = await api<{ data: { id: string } }>(`/manage/courses/${course.id}/modules`, { method: 'POST', body: { title: 'Evaluación final' } });
        await api(`/manage/modules/${r.data.id}/lessons`, { method: 'POST', body: { title: 'Examen final', type: 'examen_final', points: 50, pass_score: 70, max_attempts: 2, is_published: false } });
    });
    const move = (kind: 'modules' | 'lessons', id: string, direction: 'up' | 'down') =>
        run(() => api(`/manage/${kind}/${id}/move`, { method: 'POST', body: { direction } }));
    const remove = (kind: 'modules' | 'lessons', id: string, label: string, warn: string) => {
        if (window.confirm(`¿Eliminar "${label}"? ${warn}`)) void run(() => api(`/manage/${kind}/${id}`, { method: 'DELETE' }));
    };

    return (
        <div className="space-y-4">
            {error && <Alert type="error">{error}</Alert>}
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Curso → Unidades → Lecciones (lecturas, PDF, ejercicios, tests) → examen de unidad → examen final. Lo oculto no lo ven los alumnos.</p>
                <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" onClick={addFinalExam}>+ Examen final</Button>
                    <Button variant="ghost" onClick={addUnit}>+ Unidad con plantilla</Button>
                    <Button onClick={() => setModuleModal({ mode: 'create' })}><span className="flex items-center gap-1"><Plus size={16} /> Módulo vacío</span></Button>
                </div>
            </div>

            {course.modules.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">Aún no hay módulos. Crea el primero para empezar.</div>
            )}

            {course.modules.map((m, mi) => (
                <section key={m.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase text-slate-400">Módulo {mi + 1}</span>
                            <h3 className="font-semibold text-slate-800">{m.title}</h3>
                            {!m.is_published && <Badge tone="amber">Oculto</Badge>}
                        </div>
                        <div className="flex items-center">
                            <IconButton title="Subir" disabled={mi === 0} onClick={() => move('modules', m.id, 'up')}><ArrowUp size={16} /></IconButton>
                            <IconButton title="Bajar" disabled={mi === course.modules.length - 1} onClick={() => move('modules', m.id, 'down')}><ArrowDown size={16} /></IconButton>
                            <IconButton title="Editar módulo" onClick={() => setModuleModal({ mode: 'edit', mod: m })}><Pencil size={16} /></IconButton>
                            <IconButton title="Eliminar módulo" danger onClick={() => remove('modules', m.id, m.title, 'Se borrarán sus lecciones, preguntas y el progreso de los alumnos en ellas.')}><Trash2 size={16} /></IconButton>
                            <Button variant="ghost" onClick={() => setLessonModal({ moduleId: m.id })}><span className="flex items-center gap-1"><Plus size={14} /> Lección</span></Button>
                        </div>
                    </div>
                    <ul className="divide-y divide-slate-100">
                        {m.lessons.map((l, li) => (
                            <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-slate-400">{li + 1}.</span>
                                    <span className="font-medium text-slate-700">{l.title}</span>
                                    <Badge tone="blue">{lessonTypeLabel(l.type)}</Badge>
                                    {l.is_free && <Badge tone="green">Gratis</Badge>}
                                    {!l.is_published && <Badge tone="amber">Oculta</Badge>}
                                    <span className="text-xs text-slate-400">{l.points} pts{l.duration_minutes ? ` · ${l.duration_minutes} min` : ''}</span>
                                </div>
                                <div className="flex items-center">
                                    {isQuizType(l.type) && (
                                        <button className="mr-2 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50" onClick={() => setQuestionsFor(l.id)}>
                                            <HelpCircle size={14} /> Preguntas ({l.questions?.length ?? 0})
                                        </button>
                                    )}
                                    <IconButton title="Subir" disabled={li === 0} onClick={() => move('lessons', l.id, 'up')}><ArrowUp size={15} /></IconButton>
                                    <IconButton title="Bajar" disabled={li === m.lessons.length - 1} onClick={() => move('lessons', l.id, 'down')}><ArrowDown size={15} /></IconButton>
                                    <IconButton title="Editar" onClick={() => setLessonModal({ moduleId: m.id, lesson: l })}><Pencil size={15} /></IconButton>
                                    <IconButton title="Eliminar" danger onClick={() => remove('lessons', l.id, l.title, 'Se borrará también el progreso de los alumnos en ella.')}><Trash2 size={15} /></IconButton>
                                </div>
                            </li>
                        ))}
                        {m.lessons.length === 0 && <li className="px-4 py-4 text-sm text-slate-400">Sin lecciones todavía.</li>}
                    </ul>
                </section>
            ))}

            {moduleModal && (
                <FormModal
                    title={moduleModal.mode === 'create' ? 'Nuevo módulo' : 'Editar módulo'} fields={moduleFields}
                    initial={initialValues(moduleFields, moduleModal.mode === 'edit' ? (moduleModal.mod as unknown as Record<string, unknown>) : undefined, { is_published: true } as Values)}
                    submitLabel="Guardar" onClose={() => setModuleModal(null)}
                    onSubmit={async (v) => {
                        const body = buildPayload(moduleFields, v, moduleModal.mode);
                        if (moduleModal.mode === 'create') await api(`/manage/courses/${course.id}/modules`, { method: 'POST', body });
                        else await api(`/manage/modules/${moduleModal.mod.id}`, { method: 'PATCH', body });
                        setModuleModal(null);
                        onChange();
                    }}
                />
            )}
            {lessonModal && (
                <FormModal
                    title={lessonModal.lesson ? 'Editar lección' : 'Nueva lección'} fields={lessonFields}
                    initial={initialValues(lessonFields, lessonModal.lesson as unknown as Record<string, unknown> | undefined, { is_published: true, points: '10', type: 'video' } as Values)}
                    submitLabel="Guardar" onClose={() => setLessonModal(null)}
                    onSubmit={async (v) => {
                        const mode = lessonModal.lesson ? 'edit' : 'create';
                        const body = buildPayload(lessonFields, v, mode);
                        if (lessonModal.lesson) await api(`/manage/lessons/${lessonModal.lesson.id}`, { method: 'PATCH', body });
                        else await api(`/manage/modules/${lessonModal.moduleId}/lessons`, { method: 'POST', body });
                        setLessonModal(null);
                        onChange();
                    }}
                />
            )}
            {questionsFor && <QuestionsModal course={course} lessonId={questionsFor} onClose={() => setQuestionsFor(null)} onChange={onChange} />}
        </div>
    );
}