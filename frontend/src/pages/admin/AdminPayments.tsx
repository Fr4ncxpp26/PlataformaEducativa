import { PAYMENT_OPTIONS } from '../../lib/constants';
import { cap, formatDate, formatMoney } from '../../lib/format';
import { Badge, statusTone } from '../../components/admin/AdminUI';
import ResourceTable from '../../components/admin/ResourceTable';

interface Row {
    id: string; amount: number; status: string; stripe_payment_intent: string | null; created_at: string;
    student: { nombre: string } | null; course: { title: string } | null;
}

export default function AdminPayments() {
    return (
        <ResourceTable<Row>
            title="Pagos"
            subtitle="Registro financiero: solo puedes cambiar el estado (los pagos no se eliminan)"
            endpoint="/admin/payments"
            filters={[{ name: 'status', label: 'Estado', options: PAYMENT_OPTIONS }]}
            editFields={[{ name: 'status', label: 'Estado del pago', type: 'select', required: true, options: PAYMENT_OPTIONS }]}
            columns={[
                { header: 'Fecha', render: (r) => formatDate(r.created_at) },
                { header: 'Alumno', render: (r) => <span className="font-medium text-slate-800">{r.student?.nombre ?? '—'}</span> },
                { header: 'Concepto', render: (r) => r.course?.title ?? 'Membresía / otro' },
                { header: 'Monto', render: (r) => <span className="font-semibold">{formatMoney(r.amount)}</span> },
                { header: 'Estado', render: (r) => <Badge tone={statusTone(r.status)}>{cap(r.status)}</Badge> },
                { header: 'Stripe', render: (r) => <code className="text-xs text-slate-400">{r.stripe_payment_intent?.slice(0, 14) ?? '—'}</code> },
            ]}
        />
    );
}