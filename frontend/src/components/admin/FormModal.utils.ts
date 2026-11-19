import type { Option } from '../../lib/constants';

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

const pad = (value: number) => String(value).padStart(2, '0');

const toLocalInput = (iso: string) => {
    const date = new Date(iso);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const initialValues = (fields: FieldDef[], row?: Record<string, unknown>, defaults?: Values): Values =>
    Object.fromEntries(fields.map((field) => {
        const value = row?.[field.name];
        if (field.type === 'checkbox') return [field.name, row ? Boolean(value) : Boolean(defaults?.[field.name])];
        if (field.type === 'datetime-local' && typeof value === 'string' && value) return [field.name, toLocalInput(value)];
        if (value == null) return [field.name, row ? '' : String(defaults?.[field.name] ?? '')];
        return [field.name, String(value)];
    }));

// En creación se omiten vacíos; al editar, los opcionales vacíos limpian el campo.
export const buildPayload = (fields: FieldDef[], values: Values, mode: 'create' | 'edit') => {
    const result: Record<string, unknown> = {};
    for (const field of fields) {
        const value = values[field.name];
        if (field.type === 'checkbox') {
            result[field.name] = value;
            continue;
        }
        if (value === '') {
            if (mode === 'edit' && !field.required) result[field.name] = null;
            continue;
        }
        if (field.type === 'number') result[field.name] = Number(value);
        else if (field.type === 'datetime-local') result[field.name] = new Date(String(value)).toISOString();
        else result[field.name] = value;
    }
    return result;
};
