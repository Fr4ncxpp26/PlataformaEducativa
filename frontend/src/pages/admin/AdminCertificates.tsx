import { formatDate, shortId } from '../../lib/format';
import { useOptions } from '../../hooks/UseOptions';
import ResourceTable from '../../components/admin/ResourceTable';

interface Row { id: string; issue_date: string; student: { nombre: string } | null; course: { title: string } | null }

export default function AdminCertificates() {
    const students = useOptions('students');
    const courses = useOptions('courses');

    return (
        <ResourceTable<Row>
            title="Certificados"
            subtitle="Emisión y revocación. El folio verificable es el identificador del certificado."
            endpoint="/admin/certificates"
            newLabel="Emitir certificado"
            createFields={[
                { name: 'student_id', label: 'Alumno', type: 'select', required: true, options: students },
                { name: 'course_id', label: 'Curso', type: 'select', required: true, options: courses },
            ]}
            canDelete
            itemName={(r) => `certificado ${shortId(r.id)}`}
            columns={[
                { header: 'Folio', render: (r) => <code className="rounded bg-slate-100 px-2 py-0.5 text-xs" title={r.id}>{shortId(r.id)}</code> },
                { header: 'Alumno', render: (r) => <span className="font-medium text-slate-800">{r.student?.nombre ?? '—'}</span> },
                { header: 'Curso', render: (r) => r.course?.title ?? '—' },
                { header: 'Emitido', render: (r) => formatDate(r.issue_date) },
            ]}
        />
    );
}