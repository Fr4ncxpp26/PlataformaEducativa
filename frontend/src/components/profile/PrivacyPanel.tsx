import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { api, errorMessage } from '../../lib/api';
import { Alert, Button, Field } from '../ui';
import type { AuthUser, ProfileData } from '../../types/user';
 
export default function PrivacyPanel({ user, auth }: { user: AuthUser; auth: ProfileData['auth'] }) {
    const { updateProfile, logout } = useAuth();
    const navigate = useNavigate();
    const student = user.rol === 'alumno_adulto';
    const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
    const [exporting, setExporting] = useState(false);
    const [confirm, setConfirm] = useState('');
    const [password, setPassword] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
 
    const toggleRanking = async () => {
        setMsg(null);
        try { await updateProfile({ ranking_visible: !user.ranking_visible }); }
        catch (e) { setMsg({ type: 'error', text: errorMessage(e) }); }
    };
 
    const download = async () => {
        setExporting(true); setMsg(null);
        try {
            const data = await api<unknown>('/users/me/export');
            const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
            const a = document.createElement('a');
            a.href = url; a.download = 'mis-datos.json'; a.click();
            URL.revokeObjectURL(url);
        } catch (e) { setMsg({ type: 'error', text: errorMessage(e) }); }
        finally { setExporting(false); }
    };
 
    const remove = async () => {
        setDeleting(true); setDeleteError('');
        try {
            await api('/users/me', { method: 'DELETE', body: { confirm: 'ELIMINAR', ...(auth.hasPassword ? { password } : {}) } });
            await logout(); // limpia la sesión local
            navigate('/login', { replace: true });
        } catch (e) { setDeleteError(errorMessage(e)); setDeleting(false); }
    };
 
    return (
        <div className="space-y-6">
            {msg && <Alert type={msg.type}>{msg.text}</Alert>}
 
            {student && (
                <section className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div>
                        <h2 className="font-semibold text-slate-800">Aparecer en rankings</h2>
                        <p className="text-sm text-slate-500">Tu perfil es privado por defecto. Si lo activas, aparecerás en la tabla de clasificación y otros alumnos podrán abrir tu perfil público.</p>
                        <p className="mt-2 text-xs text-slate-500"><b>Público:</b> nombre, foto, titular, biografía, puntos, racha, cursos, certificados e insignias. <b>Siempre privado:</b> correo, teléfono, país, contraseña y pagos.</p>
                        {user.ranking_visible && <Link to={`/perfil/${user.id}`} className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:underline">Ver cómo me ven los demás →</Link>}
                    </div>
                    <button role="switch" aria-checked={!!user.ranking_visible} onClick={toggleRanking}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition ${user.ranking_visible ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${user.ranking_visible ? 'left-5' : 'left-0.5'}`} />
                    </button>
                </section>
            )}
 
            <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                    <h2 className="font-semibold text-slate-800">Descargar mis datos</h2>
                    <p className="text-sm text-slate-500">Obtén un archivo con tu perfil, progreso, evaluaciones, certificados y tutorías.</p>
                </div>
                <Button variant="ghost" onClick={download} loading={exporting}><span className="flex items-center gap-1"><Download size={16} /> Descargar</span></Button>
            </section>
 
            <section className="rounded-2xl border border-red-200 bg-white p-6">
                <h2 className="font-semibold text-red-700">Eliminar cuenta</h2>
                <p className="mt-1 text-sm text-slate-600">Se borrarán tu perfil, progreso y certificados de forma permanente. Esta acción no se puede deshacer.</p>
                <div className="mt-4 grid max-w-lg gap-3 sm:grid-cols-2">
                    {auth.hasPassword && <Field label="Tu contraseña" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
                    <Field label="Escribe ELIMINAR para confirmar" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </div>
                <div className="mt-4">
                    <Button variant="danger" loading={deleting} disabled={confirm !== 'ELIMINAR' || (auth.hasPassword && !password)} onClick={remove}>Eliminar mi cuenta</Button>
                </div>
                {deleteError && <div className="mt-3"><Alert type="error">{deleteError}</Alert></div>}
            </section>
        </div>
    );
}
 