import { useState } from 'react';
import type { FormEvent } from 'react';
import { errorMessage } from '../../lib/api';
import type { Option } from '../../lib/constants';
import { Alert, Button, Field } from '../ui';
import { Modal, SelectField, TextAreaField } from './AdminUI';

export interface FieldDef {
    name: string;
    label: string;
    type?: 'text' | 'number' | 'email' | 'password' | 'url' | 'textarea' | 'select' | 'checkbox' | 'datetime-local';
    options?: Option[];
    required?: boolean;
    placeholder?: string;
    step?: string;
}
export type Values = Record<string, string | boolean>;

const pad = (n: number) => String(n).padStart(2, '0');
const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const initialValues = (fields: FieldDef[], row?: Record<string, unknown>, defaults?: Values): Values =>
    Object.fromEntries(fields.map((f) => {
        const v = row?.[f.name];
        if (f.type === 'checkbox') return [f.name, row ? Boolean(v) : Boolean(defaults?.[f.name])];
        if (f.type === 'datetime-local' && typeof v === 'string' && v) return [f.name, toLocalInput(v)];
        if (v == null) return [f.name, row ? '' : String(defaults?.[f.name] ?? '')];
        return [f.name, String(v)];
    }));

// Crear: omite vacíos. Editar: los opcionales vacíos se envían como null (limpiar campo).
export const buildPayload = (fields: FieldDef[], values: Values, mode: 'create' | 'edit') => {
    const out: Record<string, unknown> = {};
    for (const f of fields) {
        const v = values[f.name];
        if (f.type === 'checkbox') { out[f.name] = v; continue; }
        if (v === '') {
            if (mode === 'edit' && !f.required) out[f.name] = null;
            continue;
        }
        if (f.type === 'number') out[f.name] = Number(v);
        else if (f.type === 'datetime-local') out[f.name] = new Date(String(v)).toISOString();
        else out[f.name] = v;
    }
    return out;
};

export function FieldsGrid({ fields, values, set }: { fields: FieldDef[]; values: Values; set: (name: string, v: string | boolean) => void }) {
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => {
                const value = values[f.name];
                if (f.type === 'checkbox') {
                    return (
                        <label key={f.name} className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                            <input type="checkbox" checked={Boolean(value)} onChange={(e) => set(f.name, e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                            {f.label}
                        </label>
                    );
                }
                if (f.type === 'select') {
                    return <SelectField key={f.name} label={f.label} required={f.required} options={f.options ?? []} value={String(value)} onChange={(e) => set(f.name, e.target.value)} />;
                }
                if (f.type === 'textarea') {
                    return <div key={f.name} className="sm:col-span-2"><TextAreaField label={f.label} value={String(value)} onChange={(e) => set(f.name, e.target.value)} /></div>;
                }
                return (
                    <Field
                        key={f.name} label={f.label} type={f.type ?? 'text'} required={f.required}
                        placeholder={f.placeholder} step={f.step} value={String(value)}
                        onChange={(e) => set(f.name, e.target.value)}
                    />
                );
            })}
        </div>
    );
}

interface Props {
    title: string;
    fields: FieldDef[];
    initial: Values;
    submitLabel: string;
    onSubmit: (values: Values) => Promise<void>;
    onClose: () => void;
}

export default function FormModal({ title, fields, initial, submitLabel, onSubmit, onClose }: Props) {
    const [values, setValues] = useState<Values>(initial);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const set = (name: string, v: string | boolean) => setValues((s) => ({ ...s, [name]: v }));

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            await onSubmit(values);
        } catch (err) {
            setError(errorMessage(err));
            setSaving(false);
        }
    };

    return (
        <Modal title={title} onClose={onClose} wide>
            <form onSubmit={submit} className="space-y-4">
                {error && <Alert type="error">{error}</Alert>}
                <FieldsGrid fields={fields} values={values} set={set} />
                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" loading={saving}>{submitLabel}</Button>
                </div>
            </form>
        </Modal>
    );
}