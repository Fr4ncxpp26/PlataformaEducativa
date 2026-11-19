import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useApi } from '../../hooks/useApi';
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
    endpoint: string;
    columns: Column<T>[];
    searchPlaceholder?: string;
    filters?: FilterDef[];
    createFields?: FieldDef[];
    editFields?: FieldDef[];
    newLabel?: string;
    canDelete?: boolean;
    deleteUrl?: (row: T) => string;
    rowKey?: (row: T) => string;
    itemName?: (row: T) => string;
    isLocked?: (row: T) => boolean;
    rowActions?: (row: T, reload: () => void) => ReactNode;
    headerAction?: ReactNode;
}

const PAGE_SIZE = 15;
const idOf = (row: object) => String((row as { id?: string }).id);

export default function ResourceTable<T extends object>(p: Props<T>) {
    const [page, setPage] = useState(1);
    const [q, setQ] = useState('');
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [notice, setNotice] = useState('');
    const [actionError, setActionError] = useState('');
    const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; row: T } | null>(null);
    const [toDelete, setToDelete] = useState<T | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => { setSearch(q); setPage(1); }, 350);
        return () => window.clearTimeout(timer);
    }, [q]);

    useEffect(() => {
        if (!notice) return;
        const timer = window.setTimeout(() => setNotice(''), 3000);
        return () => window.clearTimeout(timer);
    }, [notice]);

    const query = useMemo(() => {
        const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
        if (search) params.set('q', search);
        Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
        return `${p.endpoint}?${params.toString()}`;
    }, [p.endpoint, page, search, filters]);

    const { data: result, error, loading, reload } = useApi<{ data: T[]; total: number }>(query);
    const rows = result?.data ?? [];
    const total = result?.total ?? 0;

    const afterChange = (message: string) => {
        setModal(null);
        setActionError('');
        setNotice(message);
        if (page === 1) reload();
        else setPage(1);
    };

    const confirmDelete = async () => {
        if (!toDelete) return;
        setDeleting(true);
        setActionError('');
        try {
            await api(p.deleteUrl ? p.deleteUrl(toDelete) : `${p.endpoint}/${idOf(toDelete)}`, { method: 'DELETE' });
            setToDelete(null);
            setNotice('Eliminado correctamente');
            if (rows.length === 1 && page > 1) setPage(page - 1);
            else reload();
        } catch (e) {
            setToDelete(null);
            setActionError(errorMessage(e));
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
                        <div className="relative min-w-0 flex-1 sm:min-w-60">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                            <input
                                type="search"
                                aria-label={p.searchPlaceholder}
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder={p.searchPlaceholder}
                                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                            />
                        </div>
                    )}
                    {p.filters?.map((filter) => (
                        <select
                            key={filter.name}
                            aria-label={filter.label}
                            value={filters[filter.name] ?? ''}
                            onChange={(e) => { setFilters((current) => ({ ...current, [filter.name]: e.target.value })); setPage(1); }}
                            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm sm:flex-none"
                        >
                            <option value="">{filter.label}: todos</option>
                            {filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                    ))}
                </div>
            )}

            <div className="mb-4 space-y-2 empty:hidden">
                {error && <Alert type="error">{error}</Alert>}
                {actionError && <Alert type="error">{actionError}</Alert>}
                {notice && <Alert type="success">{notice}</Alert>}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-busy={loading}>
                <div className="overflow-x-auto" role="region" aria-label={`Tabla de ${p.title}; desplázate horizontalmente para ver todas las columnas`} tabIndex={0}>
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <tr>
                                {p.columns.map((column) => <th key={column.header} scope="col" className={`whitespace-nowrap px-4 py-3 ${column.className ?? ''}`}>{column.header}</th>)}
                                {hasActions && <th scope="col" className="whitespace-nowrap px-4 py-3 text-right">Acciones</th>}
                            </tr>
                        </thead>
                        <tbody className={`divide-y divide-slate-100 ${loading ? 'opacity-60' : ''}`}>
                            {rows.map((row) => (
                                <tr key={p.rowKey ? p.rowKey(row) : idOf(row)} className="hover:bg-slate-50/60">
                                    {p.columns.map((column) => <td key={column.header} className={`px-4 py-3 text-slate-700 ${column.className ?? ''}`}>{column.render(row)}</td>)}
                                    {hasActions && (
                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            {p.rowActions?.(row, reload)}
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
                    title={p.newLabel ?? 'Nuevo registro'}
                    fields={p.createFields}
                    initial={initialValues(p.createFields)}
                    submitLabel="Crear"
                    onClose={() => setModal(null)}
                    onSubmit={async (values) => {
                        await api(p.endpoint, { method: 'POST', body: buildPayload(p.createFields!, values, 'create') });
                        afterChange('Creado correctamente');
                    }}
                />
            )}
            {modal?.mode === 'edit' && p.editFields && (
                <FormModal
                    title="Editar registro"
                    fields={p.editFields}
                    initial={initialValues(p.editFields, modal.row as Record<string, unknown>)}
                    submitLabel="Guardar cambios"
                    onClose={() => setModal(null)}
                    onSubmit={async (values) => {
                        await api(`${p.endpoint}/${idOf(modal.row)}`, { method: 'PATCH', body: buildPayload(p.editFields!, values, 'edit') });
                        afterChange('Cambios guardados');
                    }}
                />
            )}
            {toDelete && (
                <Modal title="Confirmar eliminación" onClose={() => setToDelete(null)}>
                    <p className="text-sm text-slate-600">
                        ¿Eliminar {p.itemName ? <b>{p.itemName(toDelete)}</b> : 'este registro'}? Esta acción no se puede deshacer.
                    </p>
                    <div className="mt-6 flex flex-wrap justify-end gap-2">
                        <Button variant="ghost" onClick={() => setToDelete(null)}>Cancelar</Button>
                        <Button variant="danger" loading={deleting} onClick={confirmDelete}>Eliminar</Button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
