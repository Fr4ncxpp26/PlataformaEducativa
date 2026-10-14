import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Lock } from 'lucide-react';
import { useApi } from '../hooks/useapi';
import { Alert, Avatar, Spinner } from '../components/ui';
import { PageHeader } from '../components/admin/AdminUI';
import type { LeaderboardData, RankRow } from '../types/community';
 
const MEDAL = ['🥇', '🥈', '🥉'];
const PODIUM_BG = ['bg-amber-50 border-amber-200', 'bg-slate-50 border-slate-200', 'bg-orange-50 border-orange-200'];
 
function Podium({ rows }: { rows: RankRow[] }) {
    return (
        <div className="grid gap-3 sm:grid-cols-3">
            {rows.map((r, i) => (
                <Link key={r.id} to={`/perfil/${r.id}`} className={`flex flex-col items-center rounded-2xl border p-5 text-center transition hover:shadow-md ${PODIUM_BG[i]}`}>
                    <span className="text-3xl">{MEDAL[i]}</span>
                    <Avatar nombre={r.nombre} url={r.avatar_url} size="h-16 w-16 text-2xl" />
                    <p className="mt-2 w-full truncate font-semibold text-slate-800">{r.nombre}</p>
                    <p className="text-lg font-bold text-indigo-600">{r.points} pts</p>
                    <p className="flex items-center gap-1 text-xs text-slate-500"><Flame size={13} className="text-orange-500" />{r.streak} días</p>
                </Link>
            ))}
        </div>
    );
}
 
export default function Leaderboard() {
    const [period, setPeriod] = useState<'week' | 'all'>('week');
    const { data, error, loading } = useApi<LeaderboardData>(`/community/leaderboard?period=${period}`);
    const rows = data?.data ?? [];
    const me = data?.me;
 
    return (
        <div className="space-y-6">
            <PageHeader title="Tabla de clasificación" subtitle="Compite sanamente con otros alumnos. Haz clic en un perfil para ver su progreso."
                action={
                    <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm font-medium">
                        {([['week', 'Últimos 7 días'], ['all', 'Histórico']] as const).map(([id, label]) => (
                            <button key={id} onClick={() => setPeriod(id)} className={`rounded-md px-3 py-1.5 ${period === id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{label}</button>
                        ))}
                    </div>
                } />
            {error && <Alert type="error">{error}</Alert>}
 
            {me?.eligible && !me.visible && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
                    <span className="flex items-center gap-2"><Lock size={16} /> Tu perfil es privado, por eso no apareces en la tabla.</span>
                    <Link to="/dashboard/perfil?tab=privacidad" className="font-semibold underline">Activar “Aparecer en rankings”</Link>
                </div>
            )}
            {me?.visible && me.rank && <p className="text-sm text-slate-600">Tu posición: <b className="text-indigo-600">#{me.rank}</b></p>}
 
            {loading && !data ? <Spinner /> : (
                <>
                    {rows.length >= 3 && <Podium rows={rows.slice(0, 3)} />}
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <ul className="divide-y divide-slate-100">
                            {(rows.length >= 3 ? rows.slice(3) : rows).map((r) => (
                                <li key={r.id}>
                                    <Link to={`/perfil/${r.id}`} className={`flex items-center gap-4 px-4 py-3 hover:bg-slate-50 ${r.id === me?.id ? 'bg-indigo-50/60' : ''}`}>
                                        <span className="w-8 text-center text-sm font-bold text-slate-400">{r.rank <= 3 ? MEDAL[r.rank - 1] : r.rank}</span>
                                        <Avatar nombre={r.nombre} url={r.avatar_url} size="h-10 w-10" />
                                        <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{r.nombre}{r.id === me?.id && <span className="ml-2 text-xs text-indigo-600">(tú)</span>}</span>
                                        <span className="flex items-center gap-1 text-sm text-slate-500"><Flame size={14} className="text-orange-500" />{r.streak}</span>
                                        <span className="w-20 text-right font-semibold text-slate-800">{r.points} pts</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        {rows.length === 0 && <p className="px-6 py-14 text-center text-sm text-slate-400">Aún no hay alumnos en la tabla {period === 'week' ? 'esta semana' : ''}. ¡Sé el primero activando tu perfil público!</p>}
                    </div>
                    {period === 'week' && <p className="text-xs text-slate-400">El ranking semanal suma los puntos de las lecciones completadas en los últimos 7 días.</p>}
                </>
            )}
        </div>
    );
}
 