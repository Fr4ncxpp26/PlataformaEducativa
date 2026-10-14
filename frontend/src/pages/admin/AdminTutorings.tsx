import { SESSION_OPTIONS } from '../../lib/constants';
import { cap, formatDate } from '../../lib/format';
import { useOptions } from '../../hooks/UseOptions';
import { Badge, statusTone } from '../../components/admin/AdminUI';
import ResourceTable from '../../components/admin/ResourceTable';
import type { FieldDef } from '../../components/admin/FormModal';

interface Row {
    id: string; scheduled_at: string; status: string; meeting_url: string | null;
    student: { nombre: string } | null; teacher: { nombre: string } | null;
}

export default function AdminTutorings() {
    const students = useOptions('students');
    const teachers = useOptions('teachers');

    const editFields: FieldDef[] = [
        { name: 'scheduled_at', label: 'Fecha y hora', type: 'datetime-local', required: true },
        { name: 'status', label: 'Estado', type: 'select', required: true, options: SESSION_OPTIONS },
        { name: 'meeting_url', label: 'Enlace de videollamada (https)', type: 'url' },
        { name: 'notes', label: 'Notas', type: 'textarea' },
    ];
    const createFields: FieldDef[] = [
        { name: 'student_id', label: 'Alumno', type: 'select', required: true, options: students },
        { name: 'teacher_id', label: 'Profesor', type: 'select', required: true, options: teachers },
        ...editFields,
    ];

    return (
        <ResourceTable<Row>
            title="Tutorías 1 a 1"
            subtitle="Sesiones personalizadas entre profesores y alumnos"
            endpoint="/admin/tutorings"
            filters={[{ name: 'status', label: 'Estado', options: SESSION_OPTIONS }]}
            newLabel="Agendar tutoría"
            createFields={createFields}
            editFields={editFields}
            canDelete
            itemName={(r) => `tutoría de ${r.student?.nombre ?? 'alumno'}`}
            columns={[
                { header: 'Fecha', render: (r) => formatDate(r.scheduled_at) },
                { header: 'Alumno', render: (r) => <span className="font-medium text-slate-800">{r.student?.nombre ?? '—'}</span> },
                { header: 'Profesor', render: (r) => r.teacher?.nombre ?? '—' },
                { header: 'Estado', render: (r) => <Badge tone={statusTone(r.status)}>{cap(r.status)}</Badge> },
                {
                    header: 'Videollamada',
                    render: (r) => r.meeting_url
                        ? <a href={r.meeting_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Abrir</a>
                        : '—',
                },
            ]}
        />
    );
}