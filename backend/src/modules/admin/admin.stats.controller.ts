import { Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase';

const ROLES = ['alumno_menor', 'alumno_adulto', 'padre_tutor', 'profesor', 'editor', 'admin'] as const;

const head = (table: string) => supabaseAdmin.from(table).select('*', { count: 'exact', head: true });
const n = async (p: PromiseLike<{ count: number | null }>) => (await p).count ?? 0;

export const stats = async (_req: Request, res: Response) => {
    const [usersTotal, ...roleCounts] = await Promise.all([
        n(head('profiles')),
        ...ROLES.map((r) => n(head('profiles').eq('rol', r))),
    ]);

    const [courses, published, lessons, enrollments, certificates, tProg, tDone, tCanc, pDone, pPend] = await Promise.all([
        n(head('courses')),
        n(head('courses').eq('is_published', true)),
        n(head('lessons')),
        n(head('enrollments')),
        n(head('certificates')),
        n(head('tutoring_sessions').eq('status', 'programada')),
        n(head('tutoring_sessions').eq('status', 'completada')),
        n(head('tutoring_sessions').eq('status', 'cancelada')),
        n(head('payments').eq('status', 'completado')),
        n(head('payments').eq('status', 'pendiente')),
    ]);

    // Suma simple (suficiente por ahora; luego mover a una vista/RPC SQL)
    const { data: paid } = await supabaseAdmin.from('payments').select('amount').eq('status', 'completado').limit(10000);
    const revenue = (paid ?? []).reduce((s, p) => s + Number(p.amount), 0);

    const { data: recent } = await supabaseAdmin.from('audit_logs')
        .select('*, admin:admin_id(nombre)').order('created_at', { ascending: false }).limit(8);

    return res.status(200).json({
        users: { total: usersTotal, byRole: Object.fromEntries(ROLES.map((r, i) => [r, roleCounts[i]])) },
        courses: { total: courses, published },
        lessons, enrollments, certificates,
        tutorings: { programada: tProg, completada: tDone, cancelada: tCanc },
        payments: { revenue, completados: pDone, pendientes: pPend },
        recent: recent ?? [],
    });
};

// Listas {value,label} para los <select> de los formularios del panel
export const options = async (req: Request, res: Response) => {
    const kind = String(req.params.kind);
    const byRole = async (roles: string[]) =>
        ((await supabaseAdmin.from('profiles').select('id, nombre').in('rol', roles).order('nombre').limit(500)).data ?? [])
            .map((r) => ({ value: r.id as string, label: r.nombre as string }));

    let data: { value: string; label: string }[];
    if (kind === 'subjects') {
        data = ((await supabaseAdmin.from('subjects').select('id, name').order('name').limit(500)).data ?? [])
            .map((r) => ({ value: r.id as string, label: r.name as string }));
    } else if (kind === 'courses') {
        data = ((await supabaseAdmin.from('courses').select('id, title').order('title').limit(500)).data ?? [])
            .map((r) => ({ value: r.id as string, label: r.title as string }));
    } else if (kind === 'teachers') data = await byRole(['profesor', 'admin']);
    else if (kind === 'students') data = await byRole(['alumno_menor', 'alumno_adulto']);
    else if (kind === 'guardians') data = await byRole(['padre_tutor']);
    else if (kind === 'minors') data = await byRole(['alumno_menor']);
    else return res.status(404).json({ error: 'Lista no encontrada' });

    return res.status(200).json({ data });
};