import { Ban, RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { api, errorMessage } from '../../lib/api';
import { ROL_OPTIONS } from '../../lib/constants';
import { formatDate } from '../../lib/format';
import { Avatar } from '../../components/ui';
import { Badge, IconButton, statusTone } from '../../components/admin/AdminUI';
import ResourceTable from '../../components/admin/ResourceTable';
import type { FieldDef } from '../../components/admin/FormModal';
import { ROL_LABEL } from '../../types/user';
import type { Rol } from '../../types/user';

interface UserRow {
    id: string; nombre: string; avatar_url: string | null; rol: Rol;
    email: string | null; last_sign_in_at: string | null; banned: boolean; puntos_totales: number | null;
}

const createFields: FieldDef[] = [
    { name: 'nombre', label: 'Nombre', required: true },
    { name: 'email', label: 'Correo', type: 'email', required: true },
    { name: 'password', label: 'Contraseña inicial (mín. 8)', type: 'password', required: true },
    { name: 'rol', label: 'Rol', type: 'select', required: true, options: ROL_OPTIONS },
];
const editFields: FieldDef[] = [
    { name: 'nombre', label: 'Nombre', required: true },
    { name: 'rol', label: 'Rol', type: 'select', required: true, options: ROL_OPTIONS },
    { name: 'avatar_url', label: 'URL de avatar (https)', type: 'url' },
];

export default function AdminUsers() {
    const { user: me } = useAuth();

    return (
        <ResourceTable<UserRow>
            title="Usuarios"
            subtitle="Alumnos, tutores, profesores, editores y administradores"
            endpoint="/admin/users"
            searchPlaceholder="Buscar por nombre…"
            filters={[{ name: 'rol', label: 'Rol', options: ROL_OPTIONS }]}
            newLabel="Nuevo usuario"
            createFields={createFields}
            editFields={editFields}
            canDelete
            itemName={(r) => r.nombre}
            isLocked={(r) => r.id === me?.id}
            columns={[
                {
                    header: 'Usuario',
                    render: (r) => (
                        <div className="flex items-center gap-3">
                            <Avatar nombre={r.nombre} url={r.avatar_url} size="h-9 w-9" />
                            <div>
                                <p className="font-medium text-slate-800">{r.nombre}{r.id === me?.id && <span className="ml-2 text-xs text-slate-400">(tú)</span>}</p>
                                <p className="text-xs text-slate-500">{r.email ?? '—'}</p>
                            </div>
                        </div>
                    ),
                },
                { header: 'Rol', render: (r) => <Badge tone={statusTone(r.rol)}>{ROL_LABEL[r.rol] ?? r.rol}</Badge> },
                { header: 'Estado', render: (r) => <Badge tone={r.banned ? 'red' : 'green'}>{r.banned ? 'Suspendido' : 'Activo'}</Badge> },
                { header: 'Puntos', render: (r) => r.puntos_totales ?? 0 },
                { header: 'Último acceso', render: (r) => formatDate(r.last_sign_in_at) },
            ]}
            rowActions={(r, reload) => r.id === me?.id ? null : (
                <IconButton
                    title={r.banned ? 'Reactivar' : 'Suspender'}
                    danger={!r.banned}
                    onClick={async () => {
                        try {
                            await api(`/admin/users/${r.id}/suspend`, { method: 'POST', body: { suspend: !r.banned } });
                            reload();
                        } catch (e) { window.alert(errorMessage(e)); }
                    }}
                >
                    {r.banned ? <RotateCcw size={16} /> : <Ban size={16} />}
                </IconButton>
            )}
        />
    );
} 