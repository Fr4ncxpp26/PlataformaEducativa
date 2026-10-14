import { ACCESS_OPTIONS } from '../../lib/constants';
import { formatDate } from '../../lib/format';
import { useOptions } from '../../hooks/UseOptions';
import { Badge } from '../../components/admin/AdminUI';
import ResourceTable from '../../components/admin/ResourceTable';

interface Row { id: string; access_type: string; created_at: string; student: { nombre: string } | null; course: { title: string } | null }

export default function AdminEnrollments() {
    const students = useOptions('students');
    const courses = useOptions('courses');

    return (
        <ResourceTable<Row>
            title="Inscripciones"
            subtitle="Alumnos inscritos en cada curso (comprados, por membresía o gratuitos)"
            endpoint="/admin/enrollments"
            filters={[{ name: 'access_type', label: 'Acceso', options: ACCESS_OPTIONS }]}
            newLabel="Inscribir alumno"
            createFields={[
                { name: 'student_id', label: 'Alumno', type: 'select', required: true, options: students },
                { name: 'course_id', label: 'Curso', type: 'select', required: true, options: courses },
                { name: 'access_type', label: 'Tipo de acceso', type: 'select', required: true, options: ACCESS_OPTIONS },
            ]}
            canDelete
            itemName={(r) => `${r.student?.nombre ?? 'Alumno'} en ${r.course?.title ?? 'curso'}`}
            columns={[
                { header: 'Alumno', render: (r) => <span className="font-medium text-slate-800">{r.student?.nombre ?? '—'}</span> },
                { header: 'Curso', render: (r) => r.course?.title ?? '—' },
                { header: 'Acceso', render: (r) => <Badge tone="blue">{ACCESS_OPTIONS.find((a) => a.value === r.access_type)?.label ?? r.access_type}</Badge> },
                { header: 'Fecha', render: (r) => formatDate(r.created_at) },
            ]}
        />
    );
}