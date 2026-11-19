import { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCheck, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface NotificationItem {
    id: string;
    category: 'tutoring' | 'academic' | 'courses' | 'account' | 'system';
    title: string;
    message: string;
    href: string | null;
    read_at: string | null;
    created_at: string;
}

interface NotificationResponse {
    data: NotificationItem[];
    unreadCount: number;
}

const relativeDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(date);
};

export default function NotificationBell() {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        try {
            const result = await api<NotificationResponse>('/notifications?limit=6');
            setItems(result.data);
            setUnread(result.unreadCount);
        } catch {
            // El menú de navegación no debe bloquearse por un fallo temporal de notificaciones.
        }
    }, []);

    useEffect(() => {
        // Inicia la lectura fuera del cuerpo síncrono del efecto.
        const initialRefresh = window.setTimeout(() => { void refresh(); }, 0);
        const interval = window.setInterval(() => void refresh(), 60000);
        const onFocus = () => void refresh();
        window.addEventListener('focus', onFocus);
        return () => {
            window.clearTimeout(initialRefresh);
            window.clearInterval(interval);
            window.removeEventListener('focus', onFocus);
        };
    }, [refresh]);

    const openNotification = async (item: NotificationItem) => {
        setLoading(true);
        try {
            if (!item.read_at) {
                await api(`/notifications/${item.id}/read`, { method: 'PATCH' });
                setItems((current) => current.map((entry) =>
                    entry.id === item.id ? { ...entry, read_at: new Date().toISOString() } : entry,
                ));
                setUnread((count) => Math.max(0, count - 1));
            }
        } catch {
            await refresh();
        } finally {
            setLoading(false);
            setOpen(false);
            navigate(item.href ?? '/notificaciones');
        }
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => { setOpen((value) => !value); void refresh(); }}
                aria-label={unread > 0 ? `Notificaciones, ${unread} sin leer` : 'Notificaciones'}
                aria-expanded={open}
                aria-haspopup="dialog"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
                <Bell size={19} />
                {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                        {unread > 99 ? '99+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <>
                    <button
                        type="button"
                        aria-label="Cerrar notificaciones"
                        className="fixed inset-0 z-30 cursor-default"
                        onClick={() => setOpen(false)}
                    />
                    <section
                        role="dialog"
                        aria-label="Notificaciones recientes"
                        className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                            <div>
                                <p className="text-sm font-bold text-slate-900">Notificaciones</p>
                                <p className="text-xs text-slate-500">{unread} sin leer</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setOpen(false); navigate('/notificaciones'); }}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                                Ver todas
                            </button>
                        </div>
                        <div className="max-h-[min(65vh,28rem)] overflow-y-auto">
                            {items.length === 0 ? (
                                <div className="px-5 py-10 text-center">
                                    <Bell className="mx-auto mb-2 text-slate-300" size={26} />
                                    <p className="text-sm font-medium text-slate-700">No tienes notificaciones</p>
                                    <p className="mt-1 text-xs text-slate-500">Aquí aparecerán las novedades importantes.</p>
                                </div>
                            ) : items.map((item) => (
                                <button
                                    type="button"
                                    key={item.id}
                                    disabled={loading}
                                    onClick={() => void openNotification(item)}
                                    className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 disabled:opacity-60 ${item.read_at ? 'bg-white' : 'bg-indigo-50/60'}`}
                                >
                                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read_at ? 'bg-slate-200' : 'bg-indigo-600'}`} />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-semibold text-slate-800">{item.title}</span>
                                        <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">{item.message}</span>
                                        <span className="mt-1 block text-[11px] text-slate-400">{relativeDate(item.created_at)}</span>
                                    </span>
                                    <ChevronRight className="mt-2 shrink-0 text-slate-300" size={16} />
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => { setOpen(false); navigate('/notificaciones'); }}
                            className="flex w-full items-center justify-center gap-2 px-4 py-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                        >
                            <CheckCheck size={15} /> Abrir centro de notificaciones
                        </button>
                    </section>
                </>
            )}
        </div>
    );
}
