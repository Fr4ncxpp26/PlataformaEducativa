import { Link } from 'react-router-dom';
import { Award } from 'lucide-react';
import { useApi } from '../hooks/useapi';
import { PageHeader } from '../components/admin/AdminUI';
import { Alert, Spinner } from '../components/ui';

interface Row {
    course: { id: string; title: string; slug: string; image_url: string | null; is_published: boolean; teacher: { nombre: string } | null };
    completed: number; total: number; percent: number; certificate_id: string | null;
}

export default function MyCourses() {
    const { data, loading, error } = useApi<{ data: Row[] }>('/learning/my-courses');
    if (loading && !data) return <Spinner />;
    const rows = data?.data ?? [];

    return (
        <div>
            <PageHeader title="Mis cursos" subtitle="Retoma tu aprendizaje donde lo dejaste" />
            {error && <Alert type="error">{error}</Alert>}
            {rows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
                    <p className="text-slate-500">Aún no estás inscrito en ningún curso.</p>
                    <Link to="/cursos" className="mt-3 inline-block text-sm font-semibold text-indigo-600">Explorar el catálogo →</Link>
                </div>
            ) : (
                <div className="grid gap-5 sm:grid-cols-2">
                    {rows.map((r) => (
                        <div key={r.course.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div>
                                <h3 className="font-semibold text-slate-800">{r.course.title}</h3>
                                <p className="text-xs text-slate-400">{r.course.teacher?.nombre ?? 'Escuela Digital'}</p>
                            </div>
                            <div>
                                <div className="mb-1 flex justify-between text-xs text-slate-500"><span>{r.completed}/{r.total} lecciones</span><span>{r.percent}%</span></div>
                                <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-500 transition-all" style={{ width: `${r.percent}%` }} /></div>
                            </div>
                            <div className="flex items-center justify-between">
                                {r.course.is_published
                                    ? <Link to={`/aprender/${r.course.slug}`} className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700">{r.percent === 0 ? 'Empezar' : r.percent === 100 ? 'Repasar' : 'Continuar'}</Link>
                                    : <span className="text-xs text-amber-600">Curso no disponible temporalmente</span>}
                                {r.certificate_id && <Link to={`/verificar/${r.certificate_id}`} className="flex items-center gap-1 text-sm font-medium text-green-700"><Award size={16} /> Certificado</Link>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}