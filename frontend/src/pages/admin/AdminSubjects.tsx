import ResourceTable from '../../components/admin/ResourceTable';
import type { FieldDef } from '../../components/admin/FormModal';

interface Row { id: string; name: string; description: string | null; icon_url: string | null }

const fields: FieldDef[] = [
    { name: 'name', label: 'Nombre de la materia', required: true },
    { name: 'icon_url', label: 'URL del icono (https)', type: 'url' },
    { name: 'description', label: 'Descripción', type: 'textarea' },
];

export default function AdminSubjects() {
    return (
        <ResourceTable<Row>
            title="Materias"
            subtitle="Catálogo base: Matemáticas, Geografía, Astronomía…"
            endpoint="/admin/subjects"
            searchPlaceholder="Buscar materia…"
            newLabel="Nueva materia"
            createFields={fields}
            editFields={fields}
            canDelete
            itemName={(r) => r.name}
            columns={[
                { header: 'Materia', render: (r) => <span className="font-medium text-slate-800">{r.name}</span> },
                { header: 'Descripción', render: (r) => <span className="line-clamp-1 text-slate-500">{r.description ?? '—'}</span> },
            ]}
        />
    );
}