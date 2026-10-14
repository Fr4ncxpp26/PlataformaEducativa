import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import type { Option } from '../../lib/constants';
import { Alert, Button } from '../ui';
import { EmptyState, IconButton, Modal, PageHeader, Pagination } from './AdminUI';
import FormModal, { buildPayload, initialValues } from './FormModal';
import type { FieldDef } from './FormModal';

export interface Column<T> { header: string; render: (row: T) => ReactNode; className?: string }
export interface FilterDef { name: string; label: string; options: Option[] }

interface Props<T> {
    title: string;
    subtitle?: string;
    endpoint: string;                       // ej. '/admin/courses'
    columns: Column<T>[];
    searchPlaceholder?: string;             // si existe, muestra buscador
    filters?: FilterDef[];
    createFields?: FieldDef[];              // si existe, muestra botón "Nuevo"
    editFields?: FieldDef[];                // si existe, muestra editar
    newLabel?: string;
    canDelete?: boolean;
    deleteUrl?: (row: T) => string;         // para claves compuestas
    rowKey?: (row: T) => string;
    itemName?: (row: T) => string;
    isLocked?: (row: T) => boolean;         // oculta editar/eliminar (ej. tu propio usuario)
    rowActions?: (row: T, reload: () => void) => ReactNode;
    headerAction?: ReactNode;               // botón propio cuando no se usa createFields
}

const PAGE_SIZE = 15;
const idOf = (row: object) => String((row as { id?: string }).id);

export default function ResourceTable<T extends object>(p: Props<T>) {
    const [page, setPage] = useState(1);
    const [q, setQ] = useState('');
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [rows, setRows] = useState<T[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; row: T } | null>(null);
    const [toDelete, setToDelete] = useState<T | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => { setSearch(q); setPage(1); }, 350);
        return () => clearTimeout(t);
    }, [q]);

    useEffect(() => {
        if (!notice) return;
        const t = setTimeout(() => setNotice(''), 3000);
        return () => clearTimeout(t);
    }, [notice]);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
        if (search) params.set('q', search);
        Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
        try {
            const r = await api<{ data: T[]; total: number }>(`${p.endpoint}?${params}`);
            setRows(r.data);
            setTotal(r.total);
        } catch (e) {
            setError(errorMessage(e));
        } finally {
            setLoading(false);
        }
    }, [p.endpoint, page, search, filters]);

    useEffect(() => { void load(); }, [load]);

    const afterChange = async (msg: string) => {
        setModal(null);
        setNotice(msg);
        await load();
    };

    const confirmDelete = async () => {
        if (!toDelete) return;
        setDeleting(true);
        try {
            await api(p.deleteUrl ? p.deleteUrl(toDelete) : `${p.endpoint}/${idOf(toDelete)}`, { method: 'DELETE' });
            setToDelete(null);
            setNotice('Eliminado correctamente');
            if (rows.length === 1 && page > 1) setPage(page - 1); else await load();
        } catch (e) {
            setToDelete(null);
            setError(errorMessage(e));
        } finally {
            setDeleting(false);
        }
    };

    const hasActions = Boolean(p.rowActions || p.editFields || p.canDelete);

    return (
        <div>
            <PageHeader
                title={p.title}
                subtitle={p.subtitle}
                action={p.createFields ? (
                    <Button onClick={() => setModal({ mode: 'create' })}>
                        <span className="flex items-center gap-1"><Plus size={16} /> {p.newLabel ?? 'Nuevo'}</span>
                    </Button>
                ) : p.headerAction}
            />

            {(p.searchPlaceholder || p.filters) && (
                <div className="mb-4 flex flex-wrap gap-3">
                    {p.searchPlaceholder && (
                        <div className="relative min-w-60 flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={q} onChange={(e) => setQ(e.target.value)} placeholder={p.searchPlaceholder}
                                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                            />
                        </div>
                    )}
                    {p.filters?.map((f) => (
                        <select
                            key={f.name} value={filters[f.name] ?? ''}
                            onChange={(e) => { setFilters((s) => ({ ...s, [f.name]: e.target.value })); setPage(1); }}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        >
                            <option value="">{f.label}: todos</option>
                            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    ))}
                </div>
            )}

            <div className="mb-4 space-y-2 empty:hidden">
                {error && <Alert type="error">{error}</Alert>}
                {notice && <Alert type="success">{notice}</Alert>}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <tr>
                                {p.columns.map((c) => <th key={c.header} className={`px-4 py-3 ${c.className ?? ''}`}>{c.header}</th>)}
                                {hasActions && <th className="px-4 py-3 text-right">Acciones</th>}
                            </tr>
                        </thead>
                        <tbody className={`divide-y divide-slate-100 ${loading ? 'opacity-50' : ''}`}>
                            {rows.map((row) => (
                                <tr key={p.rowKey ? p.rowKey(row) : idOf(row)} className="hover:bg-slate-50/60">
                                    {p.columns.map((c) => <td key={c.header} className={`px-4 py-3 text-slate-700 ${c.className ?? ''}`}>{c.render(row)}</td>)}
                                    {hasActions && (
                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            {p.rowActions?.(row, () => void load())}
                                            {!p.isLocked?.(row) && p.editFields && (
                                                <IconButton title="Editar" onClick={() => setModal({ mode: 'edit', row })}><Pencil size={16} /></IconButton>
                                            )}
                                            {!p.isLocked?.(row) && p.canDelete && (
                                                <IconButton title="Eliminar" danger onClick={() => setToDelete(row)}><Trash2 size={16} /></IconButton>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {!loading && rows.length === 0 && <EmptyState text="No hay registros que mostrar" />}
                {loading && rows.length === 0 && <EmptyState text="Cargando…" />}
                <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
            </div>

            {modal?.mode === 'create' && p.createFields && (
                <FormModal
                    title={p.newLabel ?? 'Nuevo registro'} fields={p.createFields} initial={initialValues(p.createFields)}
                    submitLabel="Crear" onClose={() => setModal(null)}
                    onSubmit={async (v) => {
                        await api(p.endpoint, { method: 'POST', body: buildPayload(p.createFields!, v, 'create') });
                        setPage(1);
                        await afterChange('Creado correctamente');
                    }}
                />
            )}
            {modal?.mode === 'edit' && p.editFields && (
                <FormModal
                    title="Editar registro" fields={p.editFields} initial={initialValues(p.editFields, modal.row as Record<string, unknown>)}
                    submitLabel="Guardar cambios" onClose={() => setModal(null)}
                    onSubmit={async (v) => {
                        await api(`${p.endpoint}/${idOf(modal.row)}`, { method: 'PATCH', body: buildPayload(p.editFields!, v, 'edit') });
                        await afterChange('Cambios guardados');
                    }}
                />
            )}
            {toDelete && (
                <Modal title="Confirmar eliminación" onClose={() => setToDelete(null)}>
                    <p className="text-sm text-slate-600">
                        ¿Eliminar {p.itemName ? <b>{p.itemName(toDelete)}</b> : 'este registro'}? Esta acción no se puede deshacer.
                    </p>
                    <div className="mt-6 flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setToDelete(null)}>Cancelar</Button>
                        <Button variant="danger" loading={deleting} onClick={confirmDelete}>Eliminar</Button>
                    </div>
                </Modal>
            )}
        </div>
    );
}