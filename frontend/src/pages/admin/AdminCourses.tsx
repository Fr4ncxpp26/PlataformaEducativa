import { Eye, EyeOff } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { LEVEL_OPTIONS, PUBLISHED_OPTIONS } from '../../lib/constants';
import { formatMoney } from '../../lib/format';
import { useOptions } from '../../hooks/UseOptions';
import { Badge, IconButton } from '../../components/admin/AdminUI';
import ResourceTable from '../../components/admin/ResourceTable';
import type { FieldDef } from '../../components/admin/FormModal';

interface Row {
    id: string; title: string; slug: string; level: string; price: number | null; is_published: boolean;
    subject: { name: string } | null; teacher: { nombre: string } | null;
}

export default function AdminCourses() {
    const subjects = useOptions('subjects');
    const teachers = useOptions('teachers');

    const fields: FieldDef[] = [
        { name: 'title', label: 'Título', required: true },
        { name: 'slug', label: 'Slug (URL)', required: true, placeholder: 'matematicas-basicas' },
        { name: 'level', label: 'Nivel educativo', type: 'select', required: true, options: LEVEL_OPTIONS },
        { name: 'price', label: 'Precio (MXN)', type: 'number', step: '0.01' },
        { name: 'subject_id', label: 'Materia', type: 'select', options: subjects },
        { name: 'teacher_id', label: 'Profesor', type: 'select', options: teachers },
        { name: 'image_url', label: 'Imagen de portada (https)', type: 'url' },
        { name: 'description', label: 'Descripción', type: 'textarea' },
        { name: 'is_published', label: 'Publicado (visible en el catálogo)', type: 'checkbox' },
    ];

    return (
        <ResourceTable<Row>
            title="Cursos"
            subtitle="Crea, publica y administra todo el catálogo"
            endpoint="/admin/courses"
            searchPlaceholder="Buscar por título o slug…"
            filters={[
                { name: 'is_published', label: 'Estado', options: PUBLISHED_OPTIONS },
                { name: 'level', label: 'Nivel', options: LEVEL_OPTIONS },
            ]}
            newLabel="Nuevo curso"
            createFields={fields}
            editFields={fields}
            canDelete
            itemName={(r) => r.title}
            columns={[
                {
                    header: 'Curso',
                    render: (r) => (
                        <div>
                            <p className="font-medium text-slate-800">{r.title}</p>
                            <p className="text-xs text-slate-400">/{r.slug}</p>
                        </div>
                    ),
                },
                { header: 'Materia', render: (r) => r.subject?.name ?? '—' },
                { header: 'Profesor', render: (r) => r.teacher?.nombre ?? '—' },
                { header: 'Nivel', render: (r) => <Badge tone="indigo">{LEVEL_OPTIONS.find((l) => l.value === r.level)?.label ?? r.level}</Badge> },
                { header: 'Precio', render: (r) => (Number(r.price) === 0 ? <Badge tone="green">Gratis</Badge> : formatMoney(r.price)) },
                { header: 'Estado', render: (r) => <Badge tone={r.is_published ? 'green' : 'amber'}>{r.is_published ? 'Publicado' : 'Borrador'}</Badge> },
            ]}
            rowActions={(r, reload) => (
                <IconButton
                    title={r.is_published ? 'Despublicar' : 'Publicar'}
                    onClick={async () => {
                        try {
                            await api(`/admin/courses/${r.id}`, { method: 'PATCH', body: { is_published: !r.is_published } });
                            reload();
                        } catch (e) { window.alert(errorMessage(e)); }
                    }}
                >
                    {r.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
                </IconButton>
            )}
        />
    );
}