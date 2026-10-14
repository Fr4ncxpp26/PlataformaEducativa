import { useState } from 'react';
import { Copy, UserPlus, X } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../context/useAuth';
import { formatDate } from '../../lib/format';
import { Alert, Avatar, Button } from '../ui';
import { Modal } from '../admin/AdminUI';
import type { TutorInfo } from '../../types/learning';

// Muestra los tutores vinculados o permite agregar uno con un código de invitación
export default function TutorWidget({ tutors, onChange }: { tutors: TutorInfo[]; onChange: () => void }) {
    const { user } = useAuth();
    const [invite, setInvite] = useState<{ code: string; expires_at: string } | null>(null);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const canRemove = user?.rol === 'alumno_adulto';
    const link = invite ? `${window.location.origin}/register?rol=padre_tutor&codigo=${invite.code}` : '';

    const generate = async () => {
        setBusy(true); setError(''); setOpen(true);
        try { setInvite(await api<{ code: string; expires_at: string }>('/tutor-links/invite', { method: 'POST' })); }
        catch (e) { setError(errorMessage(e)); }
        finally { setBusy(false); }
    };
    const copy = async (text: string) => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); };
    const remove = async (t: TutorInfo) => {
        if (!window.confirm(`¿Desvincular a ${t.nombre}? Dejará de ver tu avance.`)) return;
        try { await api(`/tutor-links/${t.id}`, { method: 'DELETE' }); onChange(); } catch (e) { setError(errorMessage(e)); }
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Mi tutor</h3>
                <button onClick={generate} className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"><UserPlus size={15} /> Agregar tutor</button>
            </div>
            {tutors.length === 0 ? (
                <p className="text-sm text-slate-500">Aún no tienes un tutor vinculado. Tu tutor podrá ver tu avance, calificaciones y tiempo de estudio.</p>
            ) : (
                <ul className="space-y-2">
                    {tutors.map((t) => (
                        <li key={t.id} className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2"><Avatar nombre={t.nombre} url={t.avatar_url} size="h-8 w-8" />{t.nombre}</span>
                            {canRemove && <button onClick={() => remove(t)} className="text-slate-400 hover:text-red-600" aria-label="Desvincular"><X size={16} /></button>}
                        </li>
                    ))}
                </ul>
            )}
            {error && !open && <div className="mt-3"><Alert type="error">{error}</Alert></div>}

            {open && (
                <Modal title="Vincular a un tutor" onClose={() => { setOpen(false); onChange(); }}>
                    <div className="space-y-4 text-sm text-slate-600">
                        {error && <Alert type="error">{error}</Alert>}
                        {busy && <p>Generando código…</p>}
                        {invite && (
                            <>
                                <p>Comparte este código con tu tutor. Debe <b>registrarse como Padre / Tutor</b> (o iniciar sesión) e ingresarlo en su panel.</p>
                                <div className="flex items-center justify-between rounded-lg bg-indigo-50 px-4 py-3">
                                    <span className="font-mono text-2xl font-bold tracking-widest text-indigo-700">{invite.code}</span>
                                    <Button variant="ghost" onClick={() => copy(invite.code)}><span className="flex items-center gap-1"><Copy size={14} />{copied ? 'Copiado' : 'Copiar'}</span></Button>
                                </div>
                                <p className="text-xs text-slate-400">Vence el {formatDate(invite.expires_at)} y solo sirve una vez.</p>
                                <div>
                                    <p className="mb-1 text-xs font-medium text-slate-500">Enlace directo al registro de tutores</p>
                                    <div className="flex gap-2">
                                        <input readOnly value={link} className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs" onFocus={(e) => e.target.select()} />
                                        <Button variant="ghost" onClick={() => copy(link)}>Copiar</Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
}