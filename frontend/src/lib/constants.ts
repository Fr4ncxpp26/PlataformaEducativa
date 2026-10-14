import { ROL_LABEL } from '../types/user';

export interface Option { value: string; label: string }

export const ROL_OPTIONS: Option[] = Object.entries(ROL_LABEL).map(([value, label]) => ({ value, label }));

export const LEVEL_OPTIONS: Option[] = [
    { value: 'ninos', label: 'Niños' },
    { value: 'secundaria', label: 'Secundaria' },
    { value: 'preparatoria', label: 'Preparatoria' },
    { value: 'universidad', label: 'Universidad' },
    { value: 'profesional', label: 'Profesional / exámenes' },
];

export const ACCESS_OPTIONS: Option[] = [
    { value: 'purchased', label: 'Comprado' },
    { value: 'subscription', label: 'Membresía' },
    { value: 'free', label: 'Gratuito' },
];

export const PAYMENT_OPTIONS: Option[] = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'completado', label: 'Completado' },
    { value: 'fallido', label: 'Fallido' },
    { value: 'reembolsado', label: 'Reembolsado' },
];

export const SESSION_OPTIONS: Option[] = [
    { value: 'programada', label: 'Programada' },
    { value: 'completada', label: 'Completada' },
    { value: 'cancelada', label: 'Cancelada' },
];

export const PUBLISHED_OPTIONS: Option[] = [
    { value: 'true', label: 'Publicado' },
    { value: 'false', label: 'Borrador' },
];