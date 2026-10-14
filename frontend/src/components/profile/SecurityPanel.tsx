import { useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { passwordChecks } from '../../lib/profile';
import { formatDate } from '../../lib/format';
import { Alert, Button, Field } from '../ui';
import { Badge } from '../admin/AdminUI';
import type { ProfileData } from '../../types/user';
 
export default function SecurityPanel({ auth }: { auth: ProfileData['auth'] }) {
    const [cur, setCur] = useState('');
    const [next, setNext] = useState('');
    const [again, setAgain] = useState('');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
    const checks = passwordChecks(next);
    const strong = checks.every((c) => c.ok);
    const level = checks.filter((c) => c.ok).length;
    const valid = strong && next === again && cur.length > 0;
 
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true); setMsg(null);
        try {
            const r = await api<{ message: string }>('/users/me/password', { method: 'POST', body: { current_password: cur, new_password: next } });
            setMsg({ type: 'success', text: r.message }); setCur(''); setNext(''); setAgain('');
        } catch (err) { setMsg({ type: 'error', text: errorMessage(err) }); }
        finally { setBusy(false); }
    };
 
    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-semibold text-slate-800">Acceso a tu cuenta</h2>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    Método de inicio de sesión:
                    {auth.providers.length === 0 && <Badge tone="slate">Correo y contraseña</Badge>}
                    {auth.providers.map((p) => <Badge key={p} tone={p === 'google' ? 'red' : 'blue'}>{p === 'google' ? 'Google' : 'Correo y contraseña'}</Badge>)}
                </div>
                <p className="mt-2 text-xs text-slate-400">Último acceso: {formatDate(auth.last_sign_in_at)}</p>
            </section>
 
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-semibold text-slate-800">Cambiar contraseña</h2>
                {!auth.hasPassword ? (
                    <p className="mt-2 text-sm text-slate-500">Tu cuenta inicia sesión con Google, por lo que la contraseña se administra desde tu cuenta de Google.</p>
                ) : (
                    <form onSubmit={submit} className="mt-4 max-w-md space-y-4">
                        {msg && <Alert type={msg.type}>{msg.text}</Alert>}
                        <Field label="Contraseña actual" type="password" autoComplete="current-password" required value={cur} onChange={(e) => setCur(e.target.value)} />
                        <Field label="Nueva contraseña" type="password" autoComplete="new-password" required value={next} onChange={(e) => setNext(e.target.value)} />
                        {next && (
                            <div className="space-y-2">
                                <div className="flex gap-1">{[1, 2, 3, 4].map((i) => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= level ? (level < 3 ? 'bg-red-400' : level < 4 ? 'bg-amber-400' : 'bg-green-500') : 'bg-slate-200'}`} />)}</div>
                                <ul className="grid grid-cols-2 gap-1 text-xs">
                                    {checks.map((c) => <li key={c.label} className={`flex items-center gap-1 ${c.ok ? 'text-green-600' : 'text-slate-400'}`}>{c.ok ? <CheckCircle2 size={13} /> : <Circle size={13} />}{c.label}</li>)}
                                </ul>
                            </div>
                        )}
                        <Field label="Confirmar nueva contraseña" type="password" autoComplete="new-password" required value={again} onChange={(e) => setAgain(e.target.value)} />
                        {again && next !== again && <p className="-mt-2 text-xs text-red-600">Las contraseñas no coinciden</p>}
                        <Button type="submit" loading={busy} disabled={!valid}>Actualizar contraseña</Button>
                        <p className="text-xs text-slate-400">Al cambiarla, cerraremos tu sesión en los demás dispositivos.</p>
                    </form>
                )}
            </section>
        </div>
    );
}
 