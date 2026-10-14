import ResourceTable from '../../components/admin/ResourceTable';
import type { FieldDef } from '../../components/admin/FormModal';
import { Badge } from '../../components/admin/AdminUI';

interface Row { id: string; name: string; description: string | null; trigger_type: string; threshold: number; course_id: string | null }

const TRIGGERS = [
    { value: 'points', label: 'Puntos totales' },
    { value: 'streak', label: 'Racha (días seguidos)' },
    { value: 'lessons', label: 'Lecciones completadas' },
    { value: 'courses', label: 'Certificados obtenidos' },
    { value: 'perfect_score', label: 'Evaluaciones con 100%' },
];
const UNIT: Record<string, string> = { points: 'pts', streak: 'días', lessons: 'lecciones', courses: 'cursos', perfect_score: 'exámenes' };

const fields: FieldDef[] = [
    { name: 'name', label: 'Nombre de la insignia', required: true, placeholder: 'Racha de 7 días' },
    { name: 'trigger_type', label: 'Se otorga por…', type: 'select', required: true, options: TRIGGERS },
    { name: 'threshold', label: 'Meta a alcanzar', type: 'number', required: true },
    { name: 'icon_url', label: 'URL del icono (https)', type: 'url' },
    { name: 'description', label: 'Descripción', type: 'textarea' },
];

export default function AdminAchievements() {
    return (
        <ResourceTable<Row>
            title="Insignias"
            subtitle="Insignias generales: se otorgan solas al cumplir la meta. Las de cada curso las crea el profesor."
            endpoint="/admin/achievements"
            searchPlaceholder="Buscar insignia…"
            newLabel="Nueva insignia"
            createFields={fields}
            editFields={fields}
            canDelete
            itemName={(r) => r.name}
            columns={[
                { header: 'Insignia', render: (r) => <span className="font-medium text-slate-800">🏆 {r.name}</span> },
                { header: 'Tipo', render: (r) => (r.course_id ? <Badge tone="indigo">De un curso</Badge> : <Badge tone="blue">{TRIGGERS.find((t) => t.value === r.trigger_type)?.label ?? r.trigger_type}</Badge>) },
                { header: 'Meta', render: (r) => (r.course_id ? 'Al terminar el curso' : <Badge tone="amber">{r.threshold} {UNIT[r.trigger_type] ?? ''}</Badge>) },
                { header: 'Descripción', render: (r) => <span className="text-slate-500">{r.description ?? '—'}</span> },
            ]}
        />
    );
}