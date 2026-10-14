import { Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase';
import { env } from '../../config/env';
import { dayKey } from '../../utils/time';
import { dbError, paramId } from '../admin/admin.utils';
import { studentStats } from '../courses/courses.rewards';
import { studentCourses } from '../courses/courses.progress';
 
const yesterday = () => dayKey(new Date(Date.now() - 864e5), env.APP_TIMEZONE);
const liveStreak = (racha: unknown, last: unknown) => (typeof last === 'string' && last >= yesterday() ? Number(racha ?? 0) : 0);
 
interface Row { id: string; nombre: string; avatar_url: string | null; points: number; streak: number }
 
// ---------- Tabla de clasificación (solo alumnos adultos que eligieron aparecer) ----------
export const leaderboard = async (req: Request, res: Response) => {
    const uid = req.user!.id;
    const period = req.query.period === 'week' ? 'week' : 'all';
    let rows: Row[] = [];
 
    if (period === 'all') {
        const { data, error } = await supabaseAdmin.from('profiles')
            .select('id, nombre, avatar_url, puntos_totales, racha_actual, ultima_actividad')
            .eq('ranking_visible', true).eq('rol', 'alumno_adulto').order('puntos_totales', { ascending: false }).limit(50);
        if (error) return res.status(400).json({ error: dbError(error) });
        rows = (data ?? []).map((p) => ({ id: p.id as string, nombre: p.nombre as string, avatar_url: p.avatar_url as string | null, points: Number(p.puntos_totales ?? 0), streak: liveStreak(p.racha_actual, p.ultima_actividad) }));
    } else {
        const since = new Date(Date.now() - 7 * 864e5).toISOString();
        const { data: top } = await supabaseAdmin.rpc('weekly_leaderboard', { p_since: since, p_limit: 50 });
        const list = (top ?? []) as { student_id: string; points: number }[];
        const { data: profs } = list.length
            ? await supabaseAdmin.from('profiles').select('id, nombre, avatar_url, racha_actual, ultima_actividad').in('id', list.map((t) => t.student_id))
            : { data: [] };
        const byId = new Map((profs ?? []).map((p) => [p.id as string, p]));
        rows = list.flatMap((t) => {
            const p = byId.get(t.student_id);
            return p ? [{ id: p.id as string, nombre: p.nombre as string, avatar_url: p.avatar_url as string | null, points: Number(t.points), streak: liveStreak(p.racha_actual, p.ultima_actividad) }] : [];
        });
    }
 
    const ranked = rows.map((r, i) => ({ ...r, rank: i + 1 }));
    const { data: mine } = await supabaseAdmin.from('profiles').select('ranking_visible, rol, puntos_totales').eq('id', uid).single();
    let rank = ranked.find((r) => r.id === uid)?.rank ?? null;
    if (rank === null && period === 'all' && mine?.ranking_visible) {
        const { count } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true })
            .eq('ranking_visible', true).eq('rol', 'alumno_adulto').gt('puntos_totales', mine.puntos_totales ?? 0);
        rank = (count ?? 0) + 1;
    }
    return res.status(200).json({ period, data: ranked, me: { id: uid, eligible: mine?.rol === 'alumno_adulto', visible: !!mine?.ranking_visible, rank } });
};
 
// ---------- Perfil público ----------
// PÚBLICO: nombre, foto, titular, biografía, puntos, racha, cursos, certificados e insignias.
// PRIVADO (jamás se envía): correo, teléfono, país, contraseña, datos de pago.
export const publicProfile = async (req: Request, res: Response) => {
    const id = paramId(req, res);
    if (!id) return;
    const { data: p } = await supabaseAdmin.from('profiles').select('id, nombre, avatar_url, rol, headline, bio, ranking_visible').eq('id', id).maybeSingle();
    const isMe = id === req.user!.id;
    const student = p?.rol === 'alumno_adulto';
    const teacher = p?.rol === 'profesor';
    if (!p || !(isMe || teacher || (student && p.ranking_visible))) return res.status(404).json({ error: 'Este perfil es privado o no existe' });
 
    const profile = { id: p.id, nombre: p.nombre, avatar_url: p.avatar_url, rol: p.rol, headline: p.headline, bio: p.bio };
 
    if (teacher) {
        const { data } = await supabaseAdmin.from('courses').select('id, title, slug, level, image_url, enrollments(count)').eq('teacher_id', id).eq('is_published', true).order('created_at', { ascending: false });
        const courses = (data ?? []).map((c) => ({ id: c.id, title: c.title, slug: c.slug, level: c.level, image_url: c.image_url, students: (c.enrollments as unknown as { count: number }[])?.[0]?.count ?? 0 }));
        return res.status(200).json({ kind: 'teacher', profile, courses, preview: false });
    }
    if (!student) return res.status(200).json({ kind: 'other', profile, preview: isMe });
 
    const [stats, enrolled] = await Promise.all([studentStats(id), studentCourses(id)]);
    const { data: certs } = await supabaseAdmin.from('certificates').select('id, issue_date, course:course_id(title)').eq('student_id', id).order('issue_date', { ascending: false });
    const { data: badges } = await supabaseAdmin.from('student_achievements').select('achievement:achievement_id(id, name)').eq('student_id', id).order('awarded_at', { ascending: false }).limit(20);
    return res.status(200).json({
        kind: 'student', profile, stats: { points: stats.points, streak: stats.streak, maxStreak: stats.maxStreak, lessons: stats.lessons, certificates: stats.courses },
        courses: enrolled.filter((c) => c.course.is_published).map((c) => ({ title: c.course.title, slug: c.course.slug, percent: c.percent })),
        certificates: (certs ?? []).map((c) => ({ id: c.id, issue_date: c.issue_date, course: (c.course as unknown as { title: string } | null)?.title ?? '—' })),
        badges: (badges ?? []).map((b) => b.achievement),
        preview: isMe && !p.ranking_visible, // solo tú lo ves: aún no eres público
    });
};