import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, errorMessage } from '../../lib/api';
import { LEVEL_OPTIONS } from '../../lib/constants';
import { useOptions } from '../../hooks/UseOptions';
import { useAuth } from '../../context/useAuth';
import { Alert, Button } from '../ui';
import { SelectField } from '../admin/AdminUI';
import { FieldsGrid, buildPayload, initialValues } from '../admin/FormModal';
import type { FieldDef, Values } from '../admin/FormModal';
import type { CourseFull } from '../../types/course';

function TeacherSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const teachers = useOptions('teachers');
    return <SelectField label="Profesor responsable" options={teachers} value={value} onChange={(e) => onChange(e.target.value)} />;
}

interface Props { course?: CourseFull; onSaved: (id: string, created: boolean) => void }

export default function CourseForm({ course, onSaved }: Props) {
    const { user } = useAuth();
    const admin = user?.rol === 'admin';
    const subjects = useOptions('subjects', 'manage');

    const fields: FieldDef[] = [
        { name: 'title', label: 'Título del curso', required: true },
        { name: 'slug', label: 'Slug (URL pública)', required: true, placeholder: 'matematicas-basicas' },
        { name: 'level', label: 'Nivel educativo', type: 'select', required: true, options: LEVEL_OPTIONS },
        { name: 'price', label: 'Precio (MXN, 0 = gratis)', type: 'number', step: '0.01', required: true },
        { name: 'subject_id', label: 'Materia', type: 'select', options: subjects },
        { name: 'image_url', label: 'Imagen de portada (https)', type: 'url' },
        { name: 'description', label: 'Descripción', type: 'textarea' },
        { name: 'sequential_units', label: 'Desbloqueo secuencial: el alumno debe terminar cada unidad para abrir la siguiente', type: 'checkbox' },
    ];

    const [values, setValues] = useState<Values>(() => initialValues(fields, course as unknown as Record<string, unknown> | undefined, { price: '0' }));
    const [teacher, setTeacher] = useState(course?.teacher_id ?? '');
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
    const set = (name: string, v: string | boolean) => setValues((s) => ({ ...s, [name]: v }));

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setMsg(null);
        setSaving(true);
        try {
            const body = buildPayload(fields, values, course ? 'edit' : 'create');
            if (admin && teacher) body.teacher_id = teacher;
            if (course) {
                await api(`/manage/courses/${course.id}`, { method: 'PATCH', body });
                setMsg({ type: 'success', text: 'Cambios guardados' });
                onSaved(course.id, false);
            } else {
                const r = await api<{ data: { id: string } }>('/manage/courses', { method: 'POST', body });
                onSaved(r.data.id, true);
            }
        } catch (err) {
            setMsg({ type: 'error', text: errorMessage(err) });
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            {msg && <Alert type={msg.type}>{msg.text}</Alert>}
            <FieldsGrid fields={fields} values={values} set={set} />
            {admin && <TeacherSelect value={teacher} onChange={setTeacher} />}
            {!course && <p className="text-xs text-slate-500">El curso se crea como borrador. Después agrega módulos y lecciones, y publícalo.</p>}
            <div className="flex justify-end"><Button type="submit" loading={saving}>{course ? 'Guardar cambios' : 'Crear curso'}</Button></div>
        </form>
    );
}