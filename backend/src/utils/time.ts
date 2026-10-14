// Utilidades de zona horaria (la agenda y las rachas usan APP_TIMEZONE, no la del servidor)
const fmtParts = (d: Date, tz: string) => {
    const f = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hourCycle: 'h23', weekday: 'short',
        year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
    });
    const o: Record<string, string> = {};
    for (const p of f.formatToParts(d)) o[p.type] = p.value;
    return o;
};

// "YYYY-MM-DD" del instante en la zona dada
export const dayKey = (d: Date, tz: string) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

export const localDow = (d: Date, tz: string) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(fmtParts(d, tz).weekday);
export const localMinutes = (d: Date, tz: string) => { const p = fmtParts(d, tz); return Number(p.hour) * 60 + Number(p.minute); };

// Día de la semana de una fecha de calendario "YYYY-MM-DD" (0 = domingo)
export const dowOfDate = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

// Fecha + hora local ("2026-10-08", "16:00") en la zona tz → instante UTC
export function zonedToUtc(date: string, time: string, tz: string): Date {
    const [y, m, d] = date.split('-').map(Number);
    const [h, mi] = time.split(':').map(Number);
    const guess = Date.UTC(y, m - 1, d, h, mi);
    const offset = (t: number) => {
        const p = fmtParts(new Date(t), tz);
        return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second)) - t;
    };
    const t = guess - offset(guess);
    return new Date(guess - offset(t));
}