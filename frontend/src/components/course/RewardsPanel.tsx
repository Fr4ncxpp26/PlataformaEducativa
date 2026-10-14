import { useState } from 'react';
import type { FormEvent } from 'react';
import { Award, Pencil, Plus, Star, Trash2, Trophy } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useApi } from '../../hooks/useApi';
import { Alert, Button, Field } from '../ui';
import { IconButton, StatCard } from '../admin/AdminUI';
import FormModal, { buildPayload, initialValues } from '../admin/FormModal';
import type { FieldDef } from '../admin/FormModal';
import type { Achievement, CourseFull } from '../../types/course';

const fields: FieldDef[] = [
    { name: 'name', label: 'Nombre del logro', required: true, placeholder: 'Maestro de las fracciones' },
    { name: 'icon_url', label: 'URL del icono (https)', type: 'url' },
    { name: 'description', label: 'Descripción', type: 'textarea' },
];

export default function RewardsPanel({ course, onChange }: { course: CourseFull; onChange: () => void }) {
    const list = useApi<{ data: Achievement[] }>(`/manage/courses/${course.id}/achievements`);
    const [points, setPoints] = useState(String(course.completion_points));
    const [pass, setPass] = useState(String(course.pass_score));
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
    const [modal, setModal] = useState<{ item?: Achievement } | null>(null);

    const lessonPoints = course.modules.flatMap((m) => m.lessons).reduce((s, l) => s + l.points, 0);

    const save = async (e: FormEvent) => {
        e.preventDefault();
        setMsg(null);
        setSaving(true);
        try {
            await api(`/manage/courses/${course.id}`, { method: 'PATCH', body: { completion_points: Number(points), pass_score: Number(pass) } });
            setMsg({ type: 'success', text: 'Recompensas actualizadas' });
            onChange();
        } catch (err) { setMsg({ type: 'error', text: errorMessage(err) }); }
        finally { setSaving(false); }
    };

    const remove = async (a: Achievement) => {
        if (!window.confirm(`¿Eliminar el logro "${a.name}"?`)) return;
        try { await api(`/manage/achievements/${a.id}`, { method: 'DELETE' }); list.reload(); }
        catch (err) { setMsg({ type: 'error', text: errorMessage(err) }); }
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Puntos por lecciones" value={lessonPoints} icon={Star} tone="amber" hint="Suma de todas las lecciones" />
                <StatCard label="Bono al terminar" value={course.completion_points} icon={Trophy} tone="green" hint="Al completar el curso" />
                <StatCard label="Certificado" value="Automático" icon={Award} tone="indigo" hint="Se emite al completar todo" />
            </div>

            <form onSubmit={save} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-semibold text-slate-800">Reglas del curso</h3>
                {msg && <Alert type={msg.type}>{msg.text}</Alert>}
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Puntos de bono por completar el curso" type="number" min={0} required value={points} onChange={(e) => setPoints(e.target.value)} />
                    <Field label="Calificación mínima para aprobar quizzes (%)" type="number" min={1} max={100} required value={pass} onChange={(e) => setPass(e.target.value)} />
                </div>
                <p className="text-xs text-slate-500">Los puntos de cada lección se definen en la pestaña Contenido. Al completar todas las lecciones publicadas el alumno recibe: certificado verificable, el bono y los logros de abajo.</p>
                <div className="flex justify-end"><Button type="submit" loading={saving}>Guardar reglas</Button></div>
            </form>

            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <h3 className="font-semibold text-slate-800">Logros de este curso</h3>
                    <Button onClick={() => setModal({})}><span className="flex items-center gap-1"><Plus size={16} /> Logro</span></Button>
                </div>
                <ul className="divide-y divide-slate-100">
                    {(list.data?.data ?? []).map((a) => (
                        <li key={a.id} className="flex items-center justify-between px-6 py-3 text-sm">
                            <div>
                                <p className="font-medium text-slate-800">🏆 {a.name}</p>
                                {a.description && <p className="text-xs text-slate-500">{a.description}</p>}
                            </div>
                            <div className="flex">
                                <IconButton title="Editar" onClick={() => setModal({ item: a })}><Pencil size={16} /></IconButton>
                                <IconButton title="Eliminar" danger onClick={() => remove(a)}><Trash2 size={16} /></IconButton>
                            </div>
                        </li>
                    ))}
                    {!list.loading && (list.data?.data ?? []).length === 0 && <li className="px-6 py-8 text-center text-sm text-slate-400">Sin logros: el alumno solo recibirá puntos y certificado.</li>}
                </ul>
            </section>

            {modal && (
                <FormModal
                    title={modal.item ? 'Editar logro' : 'Nuevo logro'} fields={fields}
                    initial={initialValues(fields, modal.item as unknown as Record<string, unknown> | undefined)}
                    submitLabel="Guardar" onClose={() => setModal(null)}
                    onSubmit={async (v) => {
                        const body = buildPayload(fields, v, modal.item ? 'edit' : 'create');
                        if (modal.item) await api(`/manage/achievements/${modal.item.id}`, { method: 'PATCH', body });
                        else await api(`/manage/courses/${course.id}/achievements`, { method: 'POST', body });
                        setModal(null);
                        list.reload();
                    }}
                />
            )}
        </div>
    );
}