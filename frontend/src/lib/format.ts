export const formatDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export const formatMoney = (n: number | string | null | undefined) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n ?? 0));

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const shortId = (id: string) => id.slice(0, 8).toUpperCase();

export const formatDay = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
export const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
export const formatHours = (minutes: number) => (minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`);