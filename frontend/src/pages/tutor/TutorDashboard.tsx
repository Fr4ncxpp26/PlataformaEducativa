import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Star, UserPlus } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useApi } from '../../hooks/useapi';
import { Alert, Avatar, Button, Field } from '../../components/ui';
import { Badge, PageHeader } from '../../components/admin/AdminUI';
import FormModal, { buildPayload, initialValues } from '../../components/admin/FormModal';
import type { FieldDef } from '../../components/admin/FormModal';
import type { GuardianStudentRow } from '../../types/learning';

const minorFields: FieldDef[] = [
    { name: 'nombre', label: 'Nombre del menor', required: true },
    { name: 'email', label: 'Correo del menor', type: 'email', required: true },
    { name: 'password', label: 'Contraseña inicial (mín. 8, mayúscula, número y símbolo)', type: 'password', required: true },
];

export default function TutorDashboard() {
    const { data, error, loading, reload } = useApi<{ data: GuardianStudentRow[] }>('/guardian/students');
    const [code, setCode] = useState(() => localStorage.getItem('pending_invite') ?? '');
    const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const [minorModal, setMinorModal] = useState(false);

    const redeem = async (e: FormEvent) => {
        e.preventDefault(); setBusy(true); setMsg(null);
        try {
            const r = await api<{ message: string }>('/guardian/redeem', { method: 'POST', body: { code } });
            localStorage.removeItem('pending_invite');
            setCode(''); setMsg({ type: 'success', text: r.message }); reload();
        } catch (err) { setMsg({ type: 'error', text: errorMessage(err) }); }
        finally { setBusy(false); }
    };

    const students = data?.data ?? [];
    return (
        <div className="space-y-6">
            <PageHeader title="Mis alumnos" subtitle="Sigue el avance, las calificaciones y el tiempo de estudio de tus hijos o alumnos vinculados"
                action={<Button onClick={() => setMinorModal(true)}><span className="flex items-center gap-1"><UserPlus size={16} /> Crear cuenta de mi hijo/a</span></Button>} />
            {msg && <Alert type={msg.type}>{msg.text}</Alert>}
            {error && <Alert type="error">{error}</Alert>}

            <form onSubmit={redeem} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="min-w-60 flex-1">
                    <Field label="¿Un alumno te dio un código de invitación?" placeholder="ABCD2345" maxLength={8} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
                </div>
                <Button type="submit" loading={busy} disabled={code.length !== 8}>Vincular alumno</Button>
            </form>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {students.map((s) => (
                    <Link key={s.id} to={`/tutor/alumno/${s.id}`} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md">
                        <div className="flex items-center gap-3">
                            <Avatar nombre={s.nombre} url={s.avatar_url} size="h-11 w-11" />
                            <div><p className="font-semibold text-slate-800">{s.nombre}</p><Badge tone={s.rol === 'alumno_menor' ? 'blue' : 'slate'}>{s.rol === 'alumno_menor' ? 'Menor' : 'Alumno'}</Badge></div>
                        </div>
                        <div>
                            <div className="mb-1 flex justify-between text-xs text-slate-500"><span>Avance promedio · {s.courses} cursos</span><span>{s.avgPercent}%</span></div>
                            <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${s.avgPercent}%` }} /></div>
                        </div>
                        <div className="flex gap-4 text-sm text-slate-600"><span className="flex items-center gap-1"><Star size={14} className="text-amber-500" />{s.points} pts</span><span className="flex items-center gap-1"><Flame size={14} className="text-orange-500" />{s.streak} días</span></div>
                    </Link>
                ))}
            </div>
            {!loading && students.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">Aún no tienes alumnos vinculados. Crea la cuenta de tu hijo/a o canjea un código.</p>}

            {minorModal && (
                <FormModal title="Crear cuenta de menor" fields={minorFields} initial={initialValues(minorFields)} submitLabel="Crear cuenta" onClose={() => setMinorModal(false)}
                    onSubmit={async (v) => {
                        await api('/auth/register-minor', { method: 'POST', body: buildPayload(minorFields, v, 'create') });
                        setMinorModal(false); setMsg({ type: 'success', text: 'Cuenta creada y vinculada. El menor ya puede iniciar sesión.' }); reload();
                    }} />
            )}
        </div>
    );
}