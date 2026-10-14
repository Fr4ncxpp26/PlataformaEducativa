import { Link } from 'react-router-dom';
import { LEVEL_OPTIONS } from '../../lib/constants';
import { formatMoney } from '../../lib/format';
import { Badge } from '../admin/AdminUI';
import type { CourseSummary } from '../../types/course';

export default function CourseCard({ c }: { c: CourseSummary }) {
    const free = Number(c.price) === 0;
    return (
        <Link to={`/cursos/${c.slug}`} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
            {c.image_url
                ? <img src={c.image_url} alt={c.title} className="h-36 w-full object-cover" referrerPolicy="no-referrer" />
                : <div className="flex h-36 items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-4xl font-bold text-white/90">{c.title.charAt(0)}</div>}
            <div className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                    <Badge tone="indigo">{LEVEL_OPTIONS.find((l) => l.value === c.level)?.label ?? c.level}</Badge>
                    <span className="text-sm font-semibold text-slate-800">{free ? 'Gratis' : formatMoney(c.price)}</span>
                </div>
                <h3 className="font-semibold text-slate-800 group-hover:text-indigo-600">{c.title}</h3>
                <p className="line-clamp-2 text-sm text-slate-500">{c.description ?? 'Sin descripción'}</p>
                <p className="text-xs text-slate-400">{c.subject?.name ?? 'General'}{c.teacher ? ` · ${c.teacher.nombre}` : ''}</p>
            </div>
        </Link>
    );
}