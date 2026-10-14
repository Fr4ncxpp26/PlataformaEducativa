import { useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { useApi } from '../../hooks/useapi';
import { DAY_NAMES } from '../../lib/course';
import { formatDate, formatTime } from '../../lib/format';
import { Alert, Avatar, Button } from '../../components/ui';
import { Badge, PageHeader, statusTone } from '../../components/admin/AdminUI';
import type { TeacherCard, TutoringSession } from '../../types/learning';

const isoDay = (offset: number) => { const d = new Date(Date.now() + offset * 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export default function Tutoring() {
    const teachers = useApi<{ data: TeacherCard[] }>('/tutoring/teachers');
    const mine = useApi<{ data: TutoringSession[] }>('/tutoring/mine');
    const [teacher, setTeacher] = useState<TeacherCard | null>(null);
    const [date, setDate] = useState(isoDay(1));
    const slots = useApi<{ data: string[] }>(teacher ? `/tutoring/teachers/${teacher.id}/slots?date=${date}` : null);
    const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
    const [busy, setBusy] = useState('');

    const book = async (iso: string) => {
        if (!teacher || !window.confirm(`¿Reservar tutoría con ${teacher.nombre} el ${formatDate(iso)}?`)) return;
        setBusy(iso); setMsg(null);
        try {
            await api('/tutoring/book', { method: 'POST', body: { teacher_id: teacher.id, scheduled_at: iso } });
            setMsg({ type: 'success', text: 'Tutoría reservada. Tu profesor agregará el enlace de la videollamada.' });
            slots.reload(); mine.reload();
        } catch (e) { setMsg({ type: 'error', text: errorMessage(e) }); slots.reload(); }
        finally { setBusy(''); }
    };
    const cancel = async (s: TutoringSession) => {
        if (!window.confirm('¿Cancelar esta tutoría?')) return;
        try { await api(`/tutoring/sessions/${s.id}/cancel`, { method: 'POST' }); mine.reload(); slots.reload(); }
        catch (e) { setMsg({ type: 'error', text: errorMessage(e) }); }
    };

    return (
        <div className="space-y-8">
            <PageHeader title="Tutorías 1 a 1" subtitle="Reserva una sesión personalizada con un profesor (60 min)" />
            {msg && <Alert type={msg.type}>{msg.text}</Alert>}

            <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
                <div className="space-y-2">
                    <h2 className="font-semibold text-slate-800">1. Elige un profesor</h2>
                    {(teachers.data?.data ?? []).map((t) => (
                        <button key={t.id} onClick={() => setTeacher(t)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${teacher?.id === t.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                            <Avatar nombre={t.nombre} url={t.avatar_url} />
                            <span><span className="block text-sm font-medium text-slate-800">{t.nombre}</span><span className="text-xs text-slate-500">{t.days.map((d) => DAY_NAMES[d].slice(0, 3)).join(' · ')}</span></span>
                        </button>
                    ))}
                    {teachers.data && teachers.data.data.length === 0 && <p className="text-sm text-slate-400">Ningún profesor tiene horarios disponibles por ahora.</p>}
                </div>

                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="font-semibold text-slate-800">2. Elige día y hora</h2>
                    {!teacher ? <p className="text-sm text-slate-400">Selecciona un profesor para ver sus horarios.</p> : (
                        <>
                            <input type="date" value={date} min={isoDay(0)} max={isoDay(60)} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                            {slots.error && <Alert type="error">{slots.error}</Alert>}
                            <div className="flex flex-wrap gap-2">
                                {(slots.data?.data ?? []).map((iso) => (
                                    <Button key={iso} variant="ghost" loading={busy === iso} onClick={() => book(iso)}>{formatTime(iso)}</Button>
                                ))}
                            </div>
                            {slots.data && slots.data.data.length === 0 && <p className="text-sm text-slate-400">Sin horarios disponibles ese día.</p>}
                        </>
                    )}
                </div>
            </section>

            <section>
                <h2 className="mb-3 font-semibold text-slate-800">Mis sesiones</h2>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <tbody className="divide-y divide-slate-100">
                            {(mine.data?.data ?? []).map((s) => (
                                <tr key={s.id}>
                                    <td className="px-4 py-3 text-slate-700">{formatDate(s.scheduled_at)}</td>
                                    <td className="px-4 py-3 font-medium text-slate-800">{s.teacher?.nombre}</td>
                                    <td className="px-4 py-3"><Badge tone={statusTone(s.status)}>{s.status}</Badge></td>
                                    <td className="px-4 py-3">{s.meeting_url ? <a href={s.meeting_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Unirme</a> : <span className="text-xs text-slate-400">Enlace pendiente</span>}</td>
                                    <td className="px-4 py-3 text-right">{s.status === 'programada' && <button onClick={() => cancel(s)} className="text-xs text-red-600 hover:underline">Cancelar</button>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {mine.data && mine.data.data.length === 0 && <p className="px-6 py-10 text-center text-sm text-slate-400">Aún no has reservado tutorías.</p>}
                </div>
            </section>
        </div>
    );
}