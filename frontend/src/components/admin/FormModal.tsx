import { useState } from 'react';
import type { FormEvent } from 'react';
import { errorMessage } from '../../lib/api';
import type { Option } from '../../lib/constants';
import { Alert, Button, Field } from '../ui';
import { Modal, SelectField, TextAreaField } from './AdminUI';
import type { FieldDef, Values } from './FormModal.utils';
export type { FieldDef, Values } from './FormModal.utils';

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