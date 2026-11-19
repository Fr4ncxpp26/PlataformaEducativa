import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, CheckCheck, ExternalLink, RefreshCw, Settings2, Smartphone, Trash2 } from 'lucide-react';
import { Alert, Button, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { enablePushOnThisDevice, removePushFromThisDevice } from '../lib/push';

type Category = 'tutoring' | 'academic' | 'courses' | 'account' | 'system';

interface NotificationItem {
    id: string;
    category: Category;
    title: string;
    message: string;
    href: string | null;
    read_at: string | null;
    created_at: string;
}

interface Preferences {
    user_id: string;
    push_enabled: boolean;
    tutoring_enabled: boolean;
    academic_enabled: boolean;
    courses_enabled: boolean;
    account_enabled: boolean;
    system_enabled: boolean;
}

interface InboxResponse {
    data: NotificationItem[];
    unreadCount: number;
}

const preferenceLabels: { key: keyof Omit<Preferences, 'user_id' | 'push_enabled'>; label: string; description: string }[] = [
    { key: 'tutoring_enabled', label: 'Tutorías', description: 'Reservas, cambios, cancelaciones y recordatorios.' },
    { key: 'academic_enabled', label: 'Actividad académica', description: 'Logros y actualizaciones de aprendizaje.' },
    { key: 'courses_enabled', label: 'Cursos', description: 'Avisos de nuevos cursos disponibles.' },
    { key: 'account_enabled', label: 'Cuenta', description: 'Cambios importantes relacionados con tu cuenta.' },
    { key: 'system_enabled', label: 'Sistema', description: 'Avisos técnicos y de funcionamiento de la plataforma.' },
];

const formatDate = (value: string) => new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
}).format(new Date(value));

export default function Notifications() {
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [preferences, setPreferences] = useState<Preferences | null>(null);
    const [pushAvailable, setPushAvailable] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [inbox, prefs] = await Promise.all([
                api<InboxResponse>('/notifications?limit=100'),
                api<{ data: Preferences; pushAvailable: boolean }>('/notifications/preferences'),
            ]);
            setItems(inbox.data);
            setUnreadCount(inbox.unreadCount);
            setPreferences(prefs.data);
            setPushAvailable(prefs.pushAvailable);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudieron cargar tus notificaciones.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const updatePreference = async (key: keyof Preferences, value: boolean) => {
        setSaving(key);
        setError('');
        setSuccess('');
        try {
            const result = await api<{ data: Preferences }>('/notifications/preferences', {
                method: 'PATCH',
                body: { [key]: value },
            });
            setPreferences(result.data);
            setSuccess('Preferencias guardadas.');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo guardar la preferencia.');
        } finally {
            setSaving(null);
        }
    };

    const enablePush = async () => {
        setSaving('push');
        setError('');
        setSuccess('');
        try {
            await enablePushOnThisDevice();
            const result = await api<{ data: Preferences }>('/notifications/preferences');
            setPreferences(result.data);
            setSuccess('Este dispositivo quedó registrado para recibir notificaciones.');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudieron activar las notificaciones push.');
        } finally {
            setSaving(null);
        }
    };

    const disablePush = async () => {
        await updatePreference('push_enabled', false);
    };

    const testPush = async () => {
        setSaving('test');
        setError('');
        setSuccess('');
        try {
            const result = await api<{ message: string }>('/notifications/push/test', { method: 'POST' });
            setSuccess(result.message);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo enviar la prueba push.');
        } finally {
            setSaving(null);
        }
    };

    const removeDevice = async () => {
        setSaving('device');
        setError('');
        setSuccess('');
        try {
            await removePushFromThisDevice();
            const result = await api<{ data: Preferences }>('/notifications/preferences');
            setPreferences(result.data);
            setSuccess('Este dispositivo se desvinculó correctamente.');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo desvincular este dispositivo.');
        } finally {
            setSaving(null);
        }
    };

    const markRead = async (item: NotificationItem) => {
        if (item.read_at) return;
        try {
            await api(`/notifications/${item.id}/read`, { method: 'PATCH' });
            setItems((current) => current.map((entry) =>
                entry.id === item.id ? { ...entry, read_at: new Date().toISOString() } : entry,
            ));
            setUnreadCount((count) => Math.max(0, count - 1));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo actualizar la notificación.');
        }
    };

    const markAllRead = async () => {
        setSaving('all-read');
        try {
            await api('/notifications/read-all', { method: 'POST' });
            setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
            setUnreadCount(0);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudieron marcar como leídas.');
        } finally {
            setSaving(null);
        }
    };

    const deleteItem = async (id: string) => {
        try {
            await api(`/notifications/${id}`, { method: 'DELETE' });
            const removed = items.find((item) => item.id === id);
            setItems((current) => current.filter((item) => item.id !== id));
            if (removed && !removed.read_at) setUnreadCount((count) => Math.max(0, count - 1));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo eliminar la notificación.');
        }
    };

    if (loading && !preferences) return <Spinner />;

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-indigo-600">Tu espacio personal</p>
                    <h1 className="mt-1 text-2xl font-bold text-slate-900">Notificaciones</h1>
                    <p className="mt-1 text-sm text-slate-500">Consulta novedades y controla cómo quieres recibir avisos.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => void load()}><RefreshCw size={15} className="mr-2" /> Actualizar</Button>
                    <Button onClick={() => void markAllRead()} disabled={!unreadCount || saving === 'all-read'} loading={saving === 'all-read'}>
                        <CheckCheck size={15} className="mr-2" /> Marcar todo leído
                    </Button>
                </div>
            </header>

            {error && <Alert type="error">{error}</Alert>}
            {success && <Alert type="success">{success}</Alert>}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.8fr)]">
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <div>
                            <h2 className="font-bold text-slate-900">Bandeja de entrada</h2>
                            <p className="mt-0.5 text-xs text-slate-500">{unreadCount} sin leer · últimos 100 avisos</p>
                        </div>
                        <Bell className="text-slate-400" size={19} />
                    </div>

                    {items.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <Bell className="mx-auto mb-3 text-slate-300" size={34} />
                            <h3 className="font-semibold text-slate-800">Todavía no hay notificaciones</h3>
                            <p className="mt-1 text-sm text-slate-500">Cuando ocurra algo importante, aparecerá aquí.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {items.map((item) => (
                                <article key={item.id} className={`flex gap-3 px-5 py-4 transition ${item.read_at ? 'bg-white' : 'bg-indigo-50/50'}`}>
                                    <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${item.read_at ? 'bg-slate-200' : 'bg-indigo-600'}`} />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                                            {!item.read_at && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">Nueva</span>}
                                        </div>
                                        <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.message}</p>
                                        <p className="mt-2 text-xs text-slate-400">{formatDate(item.created_at)}</p>
                                        <div className="mt-3 flex flex-wrap gap-3">
                                            {item.href && (
                                                <a href={item.href} onClick={() => void markRead(item)} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                                                    Abrir <ExternalLink size={12} />
                                                </a>
                                            )}
                                            {!item.read_at && (
                                                <button type="button" onClick={() => void markRead(item)} className="text-xs font-medium text-slate-500 hover:text-slate-800">
                                                    Marcar como leída
                                                </button>
                                            )}
                                            <button type="button" onClick={() => void deleteItem(item.id)} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-600">
                                                <Trash2 size={12} /> Eliminar
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <aside className="space-y-5">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="flex items-start gap-3">
                            <span className="rounded-xl bg-indigo-50 p-2 text-indigo-600"><Smartphone size={20} /></span>
                            <div>
                                <h2 className="font-bold text-slate-900">Notificaciones push</h2>
                                <p className="mt-1 text-xs leading-relaxed text-slate-500">Recibe avisos en este dispositivo, incluso cuando no tienes abierta la plataforma.</p>
                            </div>
                        </div>
                        {!pushAvailable ? (
                            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">El administrador aún no configura las claves VAPID del servidor.</p>
                        ) : preferences?.push_enabled ? (
                            <div className="mt-4 space-y-3">
                                <Alert type="success">Las notificaciones push están activadas para tu cuenta.</Alert>
                                <Button className="w-full" onClick={() => void testPush()} loading={saving === 'test'}>
                                    <Bell size={15} className="mr-2" /> Enviar notificación de prueba
                                </Button>
                                <Button variant="ghost" className="w-full" onClick={() => void disablePush()} loading={saving === 'push_enabled'}>
                                    <BellOff size={15} className="mr-2" /> Desactivar push en todos mis dispositivos
                                </Button>
                                <button type="button" disabled={saving === 'device'} onClick={() => void removeDevice()} className="w-full text-xs font-medium text-slate-500 hover:text-red-600 disabled:opacity-50">
                                    Desvincular solo este dispositivo
                                </button>
                            </div>
                        ) : (
                            <Button className="mt-4 w-full" onClick={() => void enablePush()} loading={saving === 'push'}>
                                <Bell size={15} className="mr-2" /> Activar en este dispositivo
                            </Button>
                        )}
                        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">Los avisos push usan mensajes genéricos para proteger la información privada en pantallas bloqueadas.</p>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="mb-4 flex items-center gap-2">
                            <Settings2 size={18} className="text-slate-500" />
                            <h2 className="font-bold text-slate-900">Preferencias por categoría</h2>
                        </div>
                        <div className="space-y-4">
                            {preferenceLabels.map(({ key, label, description }) => (
                                <label key={key} className="flex cursor-pointer items-start justify-between gap-3">
                                    <span>
                                        <span className="block text-sm font-semibold text-slate-800">{label}</span>
                                        <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{description}</span>
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={preferences?.[key] ?? true}
                                        disabled={!preferences || saving === key}
                                        onChange={(event) => void updatePreference(key, event.target.checked)}
                                        className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                </label>
                            ))}
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    );
}
