import { Link } from 'react-router-dom';
import { Eye, EyeOff, Plus, Settings2 } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { LEVEL_OPTIONS, PUBLISHED_OPTIONS } from '../../lib/constants';
import { formatMoney } from '../../lib/format';
import { useAuth } from '../../context/useAuth';
import { Badge, IconButton } from '../../components/admin/AdminUI';
import ResourceTable from '../../components/admin/ResourceTable';

interface Row {
    id: string; title: string; slug: string; level: string; price: number | null; is_published: boolean;
    subject: { name: string } | null; teacher: { nombre: string } | null; enrollments: { count: number }[];
}

export default function ManageCourses() {
    const { user } = useAuth();
    const admin = user?.rol === 'admin';

    return (
        <ResourceTable<Row>
            title={admin ? 'Todos los cursos' : 'Mis cursos'}
            subtitle="Crea cursos, arma su contenido, define recompensas y emite certificados"
            endpoint="/manage/courses"
            searchPlaceholder="Buscar por título o slug…"
            filters={[
                { name: 'is_published', label: 'Estado', options: PUBLISHED_OPTIONS },
                { name: 'level', label: 'Nivel', options: LEVEL_OPTIONS },
            ]}
            headerAction={
                <Link to="/gestion/cursos/nuevo" className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                    <Plus size={16} /> Nuevo curso
                </Link>
            }
            canDelete
            itemName={(r) => r.title}
            columns={[
                {
                    header: 'Curso',
                    render: (r) => (
                        <Link to={`/gestion/cursos/${r.id}`} className="block">
                            <p className="font-medium text-slate-800 hover:text-indigo-600">{r.title}</p>
                            <p className="text-xs text-slate-400">/{r.slug}</p>
                        </Link>
                    ),
                },
                { header: 'Materia', render: (r) => r.subject?.name ?? '—' },
                ...(admin ? [{ header: 'Profesor', render: (r: Row) => r.teacher?.nombre ?? '—' }] : []),
                { header: 'Nivel', render: (r) => <Badge tone="indigo">{LEVEL_OPTIONS.find((l) => l.value === r.level)?.label ?? r.level}</Badge> },
                { header: 'Precio', render: (r) => (Number(r.price) === 0 ? <Badge tone="green">Gratis</Badge> : formatMoney(r.price)) },
                { header: 'Alumnos', render: (r) => r.enrollments?.[0]?.count ?? 0 },
                { header: 'Estado', render: (r) => <Badge tone={r.is_published ? 'green' : 'amber'}>{r.is_published ? 'Publicado' : 'Borrador'}</Badge> },
            ]}
            rowActions={(r, reload) => (
                <>
                    <Link to={`/gestion/cursos/${r.id}`} title="Gestionar" className="inline-block rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600">
                        <Settings2 size={16} />
                    </Link>
                    <IconButton
                        title={r.is_published ? 'Despublicar' : 'Publicar'}
                        onClick={async () => {
                            try {
                                await api(`/manage/courses/${r.id}`, { method: 'PATCH', body: { is_published: !r.is_published } });
                                reload();
                            } catch (e) { window.alert(errorMessage(e)); }
                        }}
                    >
                        {r.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
                    </IconButton>
                </>
            )}
        />
    );
}