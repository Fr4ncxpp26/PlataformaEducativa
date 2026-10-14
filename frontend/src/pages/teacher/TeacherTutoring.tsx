import { useState } from 'react';
import type { FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useApi } from '../../hooks/useApi';
import { DAY_NAMES } from '../../lib/course';
import { formatDate } from '../../lib/format';
import { SESSION_OPTIONS } from '../../lib/constants';
import { Alert, Button, Field } from '../../components/ui';
import { Badge, IconButton, PageHeader, SelectField, statusTone } from '../../components/admin/AdminUI';
import FormModal, { buildPayload, initialValues } from '../../components/admin/FormModal';
import type { FieldDef } from '../../components/admin/FormModal';
import type { Availability, TutoringSession } from '../../types/learning';

const sessionFields: FieldDef[] = [
    { name: 'status', label: 'Estado', type: 'select', required: true, options: SESSION_OPTIONS },
    { name: 'meeting_url', label: 'Enlace de videollamada (https)', type: 'url' },
    { name: 'notes', label: 'Notas de la sesión', type: 'textarea' },
];

export default function TeacherTutoring() {
    const av = useApi<{ data: Availability[] }>('/tutoring/availability');
    const sessions = useApi<{ data: TutoringSession[] }>('/tutoring/mine');
    const [day, setDay] = useState('1');
    const [start, setStart] = useState('16:00');
    const [end, setEnd] = useState('20:00');
    const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
    const [edit, setEdit] = useState<TutoringSession | null>(null);

    const add = async (e: FormEvent) => {
        e.preventDefault(); setMsg(null);
        try { await api('/tutoring/availability', { method: 'POST', body: { day_of_week: Number(day), start_time: start, end_time: end } }); av.reload(); }
        catch (err) { setMsg({ type: 'error', text: errorMessage(err) }); }
    };
    const remove = async (id: string) => { try { await api(`/tutoring/availability/${id}`, { method: 'DELETE' }); av.reload(); } catch (e) { setMsg({ type: 'error', text: errorMessage(e) }); } };
    const cancel = async (s: TutoringSession) => {
        if (!window.confirm('¿Cancelar esta tutoría?')) return;
        try { await api(`/tutoring/sessions/${s.id}/cancel`, { method: 'POST' }); sessions.reload(); } catch (e) { setMsg({ type: 'error', text: errorMessage(e) }); }
    };

    return (
        <div className="space-y-8">
            <PageHeader title="Mis tutorías" subtitle="Define tus horarios; los alumnos reservan sesiones de 60 minutos dentro de ellos" />
            {msg && <Alert type={msg.type}>{msg.text}</Alert>}

            <section className="grid gap-6 lg:grid-cols-2">
                <form onSubmit={add} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="font-semibold text-slate-800">Agregar horario disponible</h2>
                    <SelectField label="Día" required options={DAY_NAMES.map((n, i) => ({ value: String(i), label: n }))} value={day} onChange={(e) => setDay(e.target.value)} />
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Desde" type="time" required value={start} onChange={(e) => setStart(e.target.value)} />
                        <Field label="Hasta" type="time" required value={end} onChange={(e) => setEnd(e.target.value)} />
                    </div>
                    <Button type="submit">Agregar bloque</Button>
                </form>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-3 font-semibold text-slate-800">Mi disponibilidad semanal</h2>
                    <ul className="space-y-1 text-sm">
                        {(av.data?.data ?? []).map((a) => (
                            <li key={a.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50">
                                <span><b className="text-slate-700">{DAY_NAMES[a.day_of_week]}</b> · {a.start_time.slice(0, 5)} – {a.end_time.slice(0, 5)}</span>
                                <IconButton title="Eliminar" danger onClick={() => remove(a.id)}><Trash2 size={15} /></IconButton>
                            </li>
                        ))}
                        {av.data && av.data.data.length === 0 && <li className="text-slate-400">Sin horarios: los alumnos no podrán reservarte.</li>}
                    </ul>
                </div>
            </section>

            <section>
                <h2 className="mb-3 font-semibold text-slate-800">Sesiones</h2>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <tbody className="divide-y divide-slate-100">
                            {(sessions.data?.data ?? []).map((s) => (
                                <tr key={s.id}>
                                    <td className="px-4 py-3 text-slate-700">{formatDate(s.scheduled_at)}</td>
                                    <td className="px-4 py-3 font-medium text-slate-800">{s.student?.nombre}</td>
                                    <td className="px-4 py-3"><Badge tone={statusTone(s.status)}>{s.status}</Badge></td>
                                    <td className="px-4 py-3 text-xs text-slate-400">{s.meeting_url ? 'Con enlace' : 'Falta enlace'}</td>
                                    <td className="space-x-3 px-4 py-3 text-right">
                                        <button onClick={() => setEdit(s)} className="text-xs font-medium text-indigo-600 hover:underline">Gestionar</button>
                                        {s.status === 'programada' && <button onClick={() => cancel(s)} className="text-xs text-red-600 hover:underline">Cancelar</button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {sessions.data && sessions.data.data.length === 0 && <p className="px-6 py-10 text-center text-sm text-slate-400">Aún no tienes sesiones reservadas.</p>}
                </div>
            </section>

            {edit && (
                <FormModal
                    title="Gestionar sesión" fields={sessionFields} initial={initialValues(sessionFields, edit as unknown as Record<string, unknown>)}
                    submitLabel="Guardar" onClose={() => setEdit(null)}
                    onSubmit={async (v) => {
                        await api(`/tutoring/sessions/${edit.id}`, { method: 'PATCH', body: buildPayload(sessionFields, v, 'edit') });
                        setEdit(null); sessions.reload();
                    }}
                />
            )}
        </div>
    );
}