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
import { FileUploader } from '../FileUploader';

function TeacherSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const teachers = useOptions('teachers');
    return <SelectField label="Profesor responsable" options={teachers} value={value} onChange={(e) => onChange(e.target.value)} />;
}

export default function CourseForm({ course, onSaved }: { course?: CourseFull; onSaved: (id: string, created: boolean) => void }) {
    const { user } = useAuth();
    const isAdmin = user?.rol?.toLowerCase() === 'admin';
    const subjects = useOptions('subjects', 'manage');

    const fields: FieldDef[] = [
        { name: 'title', label: 'Título del curso', required: true },
        { name: 'slug', label: 'Slug (URL pública)', required: true, placeholder: 'matematicas-basicas' },
        { name: 'level', label: 'Nivel educativo', type: 'select', required: true, options: LEVEL_OPTIONS },
        { name: 'price', label: 'Precio (MXN, 0 = gratis)', type: 'number', step: '0.01', required: true },
        { name: 'subject_id', label: 'Materia', type: 'select', options: subjects },
        { name: 'image_url', label: 'Imagen de portada (URL)', type: 'url' },
        { name: 'description', label: 'Descripción', type: 'textarea' },
        { name: 'sequential_units', label: 'Desbloqueo secuencial de unidades', type: 'checkbox' },
    ];

    const [values, setValues] = useState<Values>(() =>
        initialValues(fields, course as unknown as Record<string, unknown> | undefined, { price: '0', image_url: '' })
    );
    const [teacher, setTeacher] = useState(course?.teacher_id ?? (user?.rol === 'profesor' ? user.id : ''));
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

    const set = (name: string, value: string | boolean) => setValues((prev) => ({ ...prev, [name]: value }));

    const submit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setMsg(null);
        setSaving(true);
        try {
            const body = buildPayload(fields, values, course ? 'edit' : 'create');
            if (isAdmin && teacher) body.teacher_id = teacher;
            else if (!course && user?.rol === 'profesor') body.teacher_id = user.id;

            if (course) {
                await api(`/manage/courses/${course.id}`, { method: 'PATCH', body });
                setMsg({ type: 'success', text: 'Cambios guardados' });
                onSaved(course.id, false);
            } else {
                const res = await api<{ data: { id: string } }>('/manage/courses', { method: 'POST', body });
                onSaved(res.data.id, true);
            }
        } catch (err) {
            setMsg({ type: 'error', text: errorMessage(err) });
        } finally {
            setSaving(false);
        }
    };

    const imageUrl = typeof values.image_url === 'string' ? values.image_url : '';
    const title = typeof values.title === 'string' ? values.title : '';
    const description = typeof values.description === 'string' ? values.description : '';

    return (
        <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            {msg && <Alert type={msg.type}>{msg.text}</Alert>}
            <FieldsGrid fields={fields.filter((f) => f.name !== 'image_url')} values={values} set={set} />

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <FileUploader
                        label="Portada del curso"
                        folder="courses/covers"
                        accept="image"
                        value={imageUrl}
                        helperText="Recomendado: 1280 × 720 px (16:9). Se optimiza automáticamente."
                        onChange={(url) => set('image_url', url)}
                    />
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 p-3 shadow-lg">
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-emerald-400">Vista previa en catálogo</span>
                    <div className="mb-2 aspect-video w-full overflow-hidden rounded-lg bg-zinc-800">
                        {imageUrl ? (
                            <img src={imageUrl} alt={`Portada de ${title || 'tu curso'}`} className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full items-center justify-center text-xs text-zinc-500">Sin portada</div>
                        )}
                    </div>
                    <p className="truncate text-sm font-semibold text-zinc-100">{title || 'Título de tu curso'}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-zinc-400">{description || 'La descripción breve aparecerá aquí...'}</p>
                </div>
            </div>

            {isAdmin && <TeacherSelect value={teacher} onChange={setTeacher} />}
            {!course && <p className="text-xs text-slate-500">El curso se crea como borrador. Podrás agregar contenido antes de publicarlo.</p>}

            <div className="flex justify-end">
                <Button type="submit" loading={saving}>{course ? 'Guardar cambios' : 'Crear curso'}</Button>
            </div>
        </form>
    );
}