import { useState } from 'react';
import { Bell, BellOff, CheckCheck, ExternalLink, RefreshCw, Settings2, Smartphone, Trash2 } from 'lucide-react';
import { Alert, Button, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { useApi } from '../hooks/useApi';
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

interface InboxResponse { data: NotificationItem[]; unreadCount: number }
interface PreferencesResponse { data: Preferences; pushAvailable: boolean }

const preferenceLabels: { key: keyof Omit<Preferences, 'user_id' | 'push_enabled'>; label: string; description: string }[] = [
    { key: 'tutoring_enabled', label: 'Tutorías', description: 'Reservas, cambios, cancelaciones y recordatorios.' },
    { key: 'academic_enabled', label: 'Actividad académica', description: 'Logros y actualizaciones de aprendizaje.' },
    { key: 'courses_enabled', label: 'Cursos', description: 'Avisos de nuevos cursos disponibles.' },
    { key: 'account_enabled', label: 'Cuenta', description: 'Cambios importantes relacionados con tu cuenta.' },
    { key: 'system_enabled', label: 'Sistema', description: 'Avisos técnicos y de funcionamiento de la plataforma.' },
];

const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
    return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

export default function Notifications() {
    const inbox = useApi<InboxResponse>('/notifications?limit=100');
    const preferenceQuery = useApi<PreferencesResponse>('/notifications/preferences');
    const [saving, setSaving] = useState<string | null>(null);
    const [actionError, setActionError] = useState('');
    const [success, setSuccess] = useState('');

    const items = inbox.data?.data ?? [];
    const unreadCount = inbox.data?.unreadCount ?? 0;
    const preferences = preferenceQuery.data?.data ?? null;
    const pushAvailable = preferenceQuery.data?.pushAvailable ?? false;
    const loading = inbox.loading || preferenceQuery.loading;
    const error = actionError || inbox.error || preferenceQuery.error;

    const refresh = () => {
        setActionError('');
        setSuccess('');
        inbox.reload();
        preferenceQuery.reload();
    };

    const savePreferences = (next: Preferences) => {
        preferenceQuery.updateData((current) => current ? { ...current, data: next } : current);
    };

    const updatePreference = async (key: keyof Preferences, value: boolean) => {
        setSaving(key);
        setActionError('');
        setSuccess('');
        try {
            const result = await api<{ data: Preferences }>('/notifications/preferences', {
                method: 'PATCH',
                body: { [key]: value },
            });
            savePreferences(result.data);
            setSuccess('Preferencias guardadas.');
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'No se pudo guardar la preferencia.');
        } finally {
            setSaving(null);
        }
    };

    const enablePush = async () => {
        setSaving('push');
        setActionError('');
        setSuccess('');
        try {
            await enablePushOnThisDevice();
            const result = await api<PreferencesResponse>('/notifications/preferences');
            preferenceQuery.updateData(result);
            setSuccess('Este dispositivo quedó registrado para recibir notificaciones.');
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'No se pudieron activar las notificaciones push.');
        } finally {
            setSaving(null);
        }
    };

    const testPush = async () => {
        setSaving('test');
        setActionError('');
        setSuccess('');
        try {
            const result = await api<{ message: string }>('/notifications/push/test', { method: 'POST' });
            setSuccess(result.message);
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'No se pudo enviar la prueba push.');
        } finally {
            setSaving(null);
        }
    };

    const removeDevice = async () => {
        setSaving('device');
        setActionError('');
        setSuccess('');
        try {
            await removePushFromThisDevice();
            const result = await api<PreferencesResponse>('/notifications/preferences');
            preferenceQuery.updateData(result);
            setSuccess('Este dispositivo se desvinculó correctamente.');
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'No se pudo desvincular este dispositivo.');
        } finally {
            setSaving(null);
        }
    };

    const markRead = async (item: NotificationItem) => {
        if (item.read_at) return;
        try {
            await api(`/notifications/${item.id}/read`, { method: 'PATCH' });
            inbox.updateData((current) => current ? {
                ...current,
                data: current.data.map((entry) => entry.id === item.id
                    ? { ...entry, read_at: new Date().toISOString() }
                    : entry),
                unreadCount: Math.max(0, current.unreadCount - 1),
            } : current);
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'No se pudo actualizar la notificación.');
        }
    };

    const markAllRead = async () => {
        setSaving('all-read');
        setActionError('');
        try {
            await api('/notifications/read-all', { method: 'POST' });
            const now = new Date().toISOString();
            inbox.updateData((current) => current ? {
                ...current,
                data: current.data.map((item) => ({ ...item, read_at: item.read_at ?? now })),
                unreadCount: 0,
            } : current);
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'No se pudieron marcar como leídas.');
        } finally {
            setSaving(null);
        }
    };

    const deleteItem = async (id: string) => {
        const removed = items.find((item) => item.id === id);
        try {
            await api(`/notifications/${id}`, { method: 'DELETE' });
            inbox.updateData((current) => current ? {
                ...current,
                data: current.data.filter((item) => item.id !== id),
                unreadCount: removed && !removed.read_at ? Math.max(0, current.unreadCount - 1) : current.unreadCount,
            } : current);
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'No se pudo eliminar la notificación.');
        }
    };

    if (loading && !inbox.data && !preferenceQuery.data) return <Spinner />;

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-indigo-600">Tu espacio personal</p>
                    <h1 className="mt-1 text-2xl font-bold text-slate-900">Notificaciones</h1>
                    <p className="mt-1 text-sm text-slate-500">Consulta novedades y controla cómo quieres recibir avisos.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" onClick={refresh}><RefreshCw size={15} className="mr-2" /> Actualizar</Button>
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

                    {inbox.loading && items.length > 0 && <p className="px-5 py-2 text-xs text-slate-400" role="status">Actualizando bandeja…</p>}
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
                                    <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${item.read_at ? 'bg-slate-200' : 'bg-indigo-600'}`} aria-hidden="true" />
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
                                <Button variant="ghost" className="w-full" onClick={() => void updatePreference('push_enabled', false)} loading={saving === 'push_enabled'}>
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
