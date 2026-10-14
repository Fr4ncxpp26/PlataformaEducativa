import { supabaseAdmin } from '../../config/supabase';

export interface LockLesson { id: string; type: string }
export interface LockModule { id: string; lessons: LockLesson[] }

// Reglas de progreso por unidad:
//  - examen_unidad: requiere terminar el resto de la unidad
//  - examen_final: requiere terminar todo lo demás
//  - unidades secuenciales (opcional del curso): la unidad N exige terminar la N-1
export function computeLocks(modules: LockModule[], done: Set<string>, sequential: boolean): Map<string, string | null> {
    const locks = new Map<string, string | null>();
    const all = modules.flatMap((m) => m.lessons);
    modules.forEach((m, mi) => {
        const prevDone = modules.slice(0, mi).every((pm) => pm.lessons.every((l) => done.has(l.id)));
        for (const l of m.lessons) {
            let reason: string | null = null;
            if (sequential && !prevDone) reason = 'Termina la unidad anterior para desbloquear esta';
            else if (l.type === 'examen_unidad' && m.lessons.some((o) => o.id !== l.id && o.type !== 'examen_unidad' && !done.has(o.id))) {
                reason = 'Completa las lecciones de la unidad para presentar el examen';
            } else if (l.type === 'examen_final' && all.some((o) => o.id !== l.id && o.type !== 'examen_final' && !done.has(o.id))) {
                reason = 'Completa todo el curso para presentar el examen final';
            }
            locks.set(l.id, reason);
        }
    });
    return locks;
}

export async function loadStructure(courseId: string): Promise<LockModule[]> {
    const { data } = await supabaseAdmin.from('course_modules')
        .select('id, position, lessons(id, type, position)')
        .eq('course_id', courseId).eq('is_published', true).eq('lessons.is_published', true).order('position');
    return ((data ?? []) as unknown as { id: string; lessons: (LockLesson & { position: number })[] }[]).map((m) => ({
        id: m.id, lessons: [...(m.lessons ?? [])].sort((a, b) => a.position - b.position),
    }));
}

export async function loadDone(uid: string, courseId: string): Promise<Set<string>> {
    const { data } = await supabaseAdmin.from('progress')
        .select('lesson_id, lesson:lesson_id!inner(module:module_id!inner(course_id))')
        .eq('student_id', uid).eq('completed', true).eq('lesson.module.course_id', courseId).limit(2000);
    return new Set((data ?? []).map((d) => d.lesson_id as string));
}