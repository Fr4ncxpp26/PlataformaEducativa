import { formatDate } from '../../lib/format';
import { Badge, statusTone } from '../../components/admin/AdminUI';
import ResourceTable from '../../components/admin/ResourceTable';
import type { AuditLog } from '../../types/admin';

const ENTITIES = ['users', 'courses', 'subjects', 'enrollments', 'payments', 'tutorings', 'certificates', 'achievements', 'guardianships'];

export default function AdminAudit() {
    return (
        <ResourceTable<AuditLog>
            title="Registros del sistema"
            subtitle="Bitácora de auditoría: quién hizo qué y cuándo"
            endpoint="/admin/audit"
            filters={[{ name: 'entity', label: 'Módulo', options: ENTITIES.map((e) => ({ value: e, label: e })) }]}
            columns={[
                { header: 'Fecha', render: (r) => formatDate(r.created_at) },
                { header: 'Administrador', render: (r) => <span className="font-medium text-slate-800">{r.admin?.nombre ?? 'Sistema'}</span> },
                { header: 'Acción', render: (r) => <Badge tone={statusTone(r.action)}>{r.action}</Badge> },
                { header: 'Módulo', render: (r) => r.entity },
                {
                    header: 'Detalle',
                    render: (r) => (
                        <code className="block max-w-xs truncate text-xs text-slate-400" title={JSON.stringify(r.details)}>
                            {r.details ? JSON.stringify(r.details) : (r.entity_id ?? '—')}
                        </code>
                    ),
                },
                { header: 'IP', render: (r) => <span className="text-xs text-slate-400">{r.ip ?? '—'}</span> },
            ]}
        />
    );
}