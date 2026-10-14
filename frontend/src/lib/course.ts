import type { Option } from './constants';

export const LESSON_TYPE_OPTIONS: Option[] = [
    { value: 'lectura', label: 'Lectura' },
    { value: 'video', label: 'Video' },
    { value: 'pdf', label: 'PDF descargable' },
    { value: 'interactivo', label: 'Escenario interactivo' },
    { value: 'ejercicio', label: 'Ejercicios de práctica' },
    { value: 'quiz', label: 'Test / quiz' },
    { value: 'examen_unidad', label: 'Examen de unidad' },
    { value: 'examen_final', label: 'Examen final' },
];
export const lessonTypeLabel = (t: string) => LESSON_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;

// Tipos que se responden con preguntas (deben coincidir con QUIZ_TYPES del backend)
export const QUIZ_TYPES = ['quiz', 'ejercicio', 'examen_unidad', 'examen_final'];
export const isQuizType = (t: string) => QUIZ_TYPES.includes(t);
export const isExam = (t: string) => t === 'examen_unidad' || t === 'examen_final';

// Solo se incrustan YouTube y Vimeo; cualquier otro enlace se abre en pestaña nueva
export function embedUrl(url: string): string | null {
    try {
        const u = new URL(url);
        const v = u.searchParams.get('v');
        if (u.hostname.endsWith('youtube.com') && v) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v)}`;
        if (u.hostname === 'youtu.be') return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(u.pathname.slice(1))}`;
        if (u.hostname.endsWith('vimeo.com')) {
            const id = u.pathname.split('/').filter(Boolean).pop();
            if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
        }
    } catch { /* URL inválida */ }
    return null;
}
export const isDirectVideo = (u: string) => /\.(mp4|webm|ogg)(\?.*)?$/i.test(u);

export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];