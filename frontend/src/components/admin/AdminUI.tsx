import { useEffect } from 'react';
import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Option } from '../../lib/constants';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
    return (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
                {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}

export type Tone = 'green' | 'red' | 'amber' | 'blue' | 'slate' | 'indigo' | 'purple';
const TONES: Record<Tone, string> = {
    green: 'bg-green-50 text-green-700 ring-green-600/20',
    red: 'bg-red-50 text-red-700 ring-red-600/20',
    amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    slate: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    purple: 'bg-purple-50 text-purple-700 ring-purple-600/20',
};

export function Badge({ tone = 'slate', children }: { tone?: Tone; children: ReactNode }) {
    return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]}`}>{children}</span>;
}

const STATUS_TONE: Record<string, Tone> = {
    completado: 'green', completada: 'green', programada: 'blue', pendiente: 'amber',
    fallido: 'red', cancelada: 'red', reembolsado: 'purple',
    crear: 'green', editar: 'blue', eliminar: 'red', suspender: 'amber', reactivar: 'green',
    admin: 'purple', profesor: 'indigo', editor: 'indigo', padre_tutor: 'blue',
};
export const statusTone = (s: string): Tone => STATUS_TONE[s] ?? 'slate';

export function IconButton({ title, danger, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { title: string; danger?: boolean }) {
    return (
        <button
            type="button"
            aria-label={title}
            {...props}
            className={`rounded-md p-1.5 transition disabled:opacity-40 ${danger ? 'text-slate-400 hover:bg-red-50 hover:text-red-600' : 'text-slate-400 hover:bg-slate-100 hover:text-indigo-600'}`}
        />
    );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={onClose}>
            <div
                className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white shadow-xl ${wide ? 'max-w-2xl' : 'max-w-md'}`}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
                    <IconButton title="Cerrar" onClick={onClose}><X size={18} /></IconButton>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

export function SelectField({ label, options, required, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: Option[] }) {
    return (
        <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
            <select
                required={required}
                {...props}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            >
                {required ? <option value="" disabled>Selecciona…</option> : <option value="">— Ninguno —</option>}
                {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </label>
    );
}

export function TextAreaField({ label, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
    return (
        <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
            <textarea
                rows={3}
                {...props}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
        </label>
    );
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'indigo' }: { label: string; value: ReactNode; hint?: string; icon: LucideIcon; tone?: Tone }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <span className={`rounded-lg p-2 ${TONES[tone]} ring-1 ring-inset`}><Icon size={18} /></span>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-800">{value}</p>
            {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
    );
}

export function Pagination({ page, pageSize, total, onChange }: { page: number; pageSize: number; total: number; onChange: (p: number) => void }) {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);
    return (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
            <span>{from}–{to} de {total}</span>
            <div className="flex items-center gap-1">
                <IconButton title="Anterior" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={18} /></IconButton>
                <span className="px-2">{page} / {pages}</span>
                <IconButton title="Siguiente" disabled={page >= pages} onClick={() => onChange(page + 1)}><ChevronRight size={18} /></IconButton>
            </div>
        </div>
    );
}

export function EmptyState({ text }: { text: string }) {
    return <div className="px-6 py-14 text-center text-sm text-slate-400">{text}</div>;
}