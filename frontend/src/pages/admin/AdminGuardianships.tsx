import { formatDate } from '../../lib/format';
import { useOptions } from '../../hooks/UseOptions';
import ResourceTable from '../../components/admin/ResourceTable';

interface Row { guardian_id: string; student_id: string; guardian: { nombre: string } | null; student: { nombre: string } | null; created_at?: string }

export default function AdminGuardianships() {
    const guardians = useOptions('guardians');
    const minors = useOptions('minors');

    return (
        <ResourceTable<Row>
            title="Padres / tutores e hijos"
            subtitle="Vincula a cada menor con su tutor. El tutor solo verá los datos de sus hijos vinculados."
            endpoint="/admin/guardianships"
            newLabel="Nueva vinculación"
            createFields={[
                { name: 'guardian_id', label: 'Padre / Tutor', type: 'select', required: true, options: guardians },
                { name: 'student_id', label: 'Alumno menor de edad', type: 'select', required: true, options: minors },
            ]}
            canDelete
            rowKey={(r) => `${r.guardian_id}:${r.student_id}`}
            deleteUrl={(r) => `/admin/guardianships?guardian_id=${r.guardian_id}&student_id=${r.student_id}`}
            itemName={(r) => `${r.guardian?.nombre ?? 'Tutor'} ↔ ${r.student?.nombre ?? 'Alumno'}`}
            columns={[
                { header: 'Padre / Tutor', render: (r) => <span className="font-medium text-slate-800">{r.guardian?.nombre ?? '—'}</span> },
                { header: 'Alumno', render: (r) => r.student?.nombre ?? '—' },
                { header: 'Desde', render: (r) => formatDate(r.created_at) },
            ]}
        />
    );
}