import { supabaseAdmin } from '../../config/supabase';
import { env } from '../../config/env';
import { dayKey } from '../../utils/time';

// Cursos del alumno con % de avance (usado por el alumno y por su tutor)
export async function studentCourses(uid: string) {
    const { data } = await supabaseAdmin.from('enrollments')
        .select('created_at, course:course_id(id, title, slug, image_url, level, is_published, teacher:teacher_id(nombre))')
        .eq('student_id', uid).order('created_at', { ascending: false });
    const { data: certs } = await supabaseAdmin.from('certificates').select('id, course_id').eq('student_id', uid);
    const certByCourse = new Map((certs ?? []).map((c) => [c.course_id as string, c.id as string]));

    return Promise.all((data ?? []).map(async (e) => {
        const course = e.course as unknown as { id: string; title: string; slug: string; image_url: string | null; is_published: boolean; teacher: { nombre: string } | null };
        const { data: total } = await supabaseAdmin.rpc('course_lesson_total', { p_course: course.id });
        const { data: prog } = await supabaseAdmin.rpc('course_progress', { p_course: course.id, p_students: [uid] });
        const done = Number((prog as { completed: number }[] | null)?.[0]?.completed ?? 0);
        const totalN = Number(total ?? 0);
        return {
            enrolled_at: e.created_at as string, course, completed: done, total: totalN,
            percent: totalN ? Math.min(100, Math.round((done / totalN) * 100)) : 0,
            certificate_id: certByCourse.get(course.id) ?? null,
        };
    }));
}

// Actividad de los últimos 7 días (para el calendario de racha)
export async function weekActivity(uid: string) {
    const since = new Date(Date.now() - 8 * 864e5).toISOString();
    const [a, b] = await Promise.all([
        supabaseAdmin.from('progress').select('completed_at').eq('student_id', uid).eq('completed', true).gte('completed_at', since),
        supabaseAdmin.from('quiz_attempts').select('created_at').eq('student_id', uid).gte('created_at', since),
    ]);
    const stamps = [...(a.data ?? []).map((r) => r.completed_at as string), ...(b.data ?? []).map((r) => r.created_at as string)];
    const active = new Set(stamps.filter(Boolean).map((d) => dayKey(new Date(d), env.APP_TIMEZONE)));
    return Array.from({ length: 7 }, (_, i) => {
        const date = dayKey(new Date(Date.now() - (6 - i) * 864e5), env.APP_TIMEZONE);
        return { date, active: active.has(date) };
    });
}