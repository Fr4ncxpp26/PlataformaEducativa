import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Award } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useApi } from '../../hooks/useapi';
import { formatDate } from '../../lib/format';
import { Alert, Button } from '../ui';
import { Badge, EmptyState } from '../admin/AdminUI';

interface Row {
    student_id: string; nombre: string; access_type: string; enrolled_at: string;
    completed: number; total: number; percent: number; certificate_id: string | null;
}

export default function StudentsPanel({ courseId }: { courseId: string }) {
    const { data, loading, error, reload } = useApi<{ data: Row[] }>(`/manage/courses/${courseId}/students`);
    const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
    const rows = data?.data ?? [];

    const issue = async (r: Row) => {
        if (!window.confirm(`¿Emitir certificado a ${r.nombre} aunque no haya terminado el curso?`)) return;
        try {
            await api(`/manage/courses/${courseId}/certificates`, { method: 'POST', body: { student_id: r.student_id } });
            setMsg({ type: 'success', text: 'Certificado emitido' });
            reload();
        } catch (e) { setMsg({ type: 'error', text: errorMessage(e) }); }
    };

    return (
        <div className="space-y-3">
            {error && <Alert type="error">{error}</Alert>}
            {msg && <Alert type={msg.type}>{msg.text}</Alert>}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <tr><th className="px-4 py-3">Alumno</th><th className="px-4 py-3">Inscrito</th><th className="px-4 py-3">Progreso</th><th className="px-4 py-3">Certificado</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {rows.map((r) => (
                            <tr key={r.student_id}>
                                <td className="px-4 py-3 font-medium text-slate-800">{r.nombre}</td>
                                <td className="px-4 py-3 text-slate-500">{formatDate(r.enrolled_at)}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-28 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${r.percent}%` }} /></div>
                                        <span className="text-xs text-slate-500">{r.completed}/{r.total} · {r.percent}%</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    {r.certificate_id
                                        ? <Link to={`/verificar/${r.certificate_id}`} className="inline-flex items-center gap-1"><Badge tone="green"><Award size={12} className="mr-1" /> Emitido</Badge></Link>
                                        : <Button variant="ghost" onClick={() => issue(r)}>Emitir</Button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!loading && rows.length === 0 && <EmptyState text="Aún no hay alumnos inscritos" />}
            </div>
        </div>
    );
}