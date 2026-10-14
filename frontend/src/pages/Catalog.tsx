import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { LEVEL_OPTIONS } from '../lib/constants';
import { PageHeader, Pagination } from '../components/admin/AdminUI';
import { Alert, Spinner } from '../components/ui';
import CourseCard from '../components/course/CourseCard';
import type { CourseSummary } from '../types/course';

const PAGE_SIZE = 12;

export default function Catalog() {
    const [q, setQ] = useState('');
    const [search, setSearch] = useState('');
    const [level, setLevel] = useState('');
    const [page, setPage] = useState(1);

    useEffect(() => {
        const t = setTimeout(() => { setSearch(q); setPage(1); }, 350);
        return () => clearTimeout(t);
    }, [q]);

    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search) params.set('q', search);
    if (level) params.set('level', level);
    const { data, loading, error } = useApi<{ data: CourseSummary[]; total: number }>(`/public/courses?${params}`);

    return (
        <div>
            <PageHeader title="Catálogo de cursos" subtitle="Aprende a tu ritmo con cursos interactivos" />
            <div className="mb-6 flex flex-wrap gap-3">
                <div className="relative min-w-60 flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cursos…"
                        className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
                </div>
                <select value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    <option value="">Todos los niveles</option>
                    {LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </div>
            {error && <Alert type="error">{error}</Alert>}
            {loading && !data ? <Spinner /> : (
                <>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {(data?.data ?? []).map((c) => <CourseCard key={c.id} c={c} />)}
                    </div>
                    {data && data.data.length === 0 && <p className="py-16 text-center text-sm text-slate-400">No se encontraron cursos.</p>}
                    {data && data.total > PAGE_SIZE && (
                        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white"><Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} /></div>
                    )}
                </>
            )}
        </div>
    );
}