export const passwordChecks = (p: string) => [
    { ok: p.length >= 8, label: '8+ caracteres' },
    { ok: /[A-Z]/.test(p), label: 'Una mayúscula' },
    { ok: /[0-9]/.test(p), label: 'Un número' },
    { ok: /[^a-zA-Z0-9]/.test(p), label: 'Un símbolo' },
];

export const COUNTRIES = ['México', 'Argentina', 'Bolivia', 'Chile', 'Colombia', 'Costa Rica', 'Cuba', 'Ecuador', 'El Salvador', 'España', 'Estados Unidos', 'Guatemala', 'Honduras', 'Nicaragua', 'Panamá', 'Paraguay', 'Perú', 'Puerto Rico', 'República Dominicana', 'Uruguay', 'Venezuela'];

export const memberSince = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });