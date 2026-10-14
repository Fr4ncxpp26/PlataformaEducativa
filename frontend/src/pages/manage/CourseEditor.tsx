import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useApi } from '../../hooks/useApi';
import { Alert, Button, Spinner } from '../../components/ui';
import { Badge } from '../../components/admin/AdminUI';
import CourseForm from '../../components/course/CourseForm';
import CurriculumEditor from '../../components/course/CurriculumEditor';
import RewardsPanel from '../../components/course/RewardsPanel';
import StudentsPanel from '../../components/course/StudentsPanel';
import type { CourseFull } from '../../types/course';

const TABS = [
    { id: 'datos', label: 'Datos' },
    { id: 'contenido', label: 'Contenido' },
    { id: 'recompensas', label: 'Recompensas y certificados' },
    { id: 'alumnos', label: 'Alumnos' },
] as const;
type Tab = (typeof TABS)[number]['id'];

export default function CourseEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'nuevo';
    const { data, error, loading, reload } = useApi<{ data: CourseFull }>(isNew ? null : `/manage/courses/${id}`);
    const [tab, setTab] = useState<Tab>('datos');
    const [msg, setMsg] = useState('');
    const course = data?.data;

    if (!isNew && !course && loading) return <Spinner />;
    if (!isNew && !course) return <Alert type="error">{error || 'Curso no encontrado'}</Alert>;

    const togglePublish = async () => {
        setMsg('');
        try {
            await api(`/manage/courses/${course!.id}`, { method: 'PATCH', body: { is_published: !course!.is_published } });
            reload();
        } catch (e) { setMsg(errorMessage(e)); }
    };

    return (
        <div>
            <Link to="/gestion/cursos" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600"><ArrowLeft size={14} /> Volver a cursos</Link>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-slate-800">{isNew ? 'Nuevo curso' : course!.title}</h1>
                    {course && <Badge tone={course.is_published ? 'green' : 'amber'}>{course.is_published ? 'Publicado' : 'Borrador'}</Badge>}
                </div>
                {course && <Button variant={course.is_published ? 'ghost' : 'primary'} onClick={togglePublish}>{course.is_published ? 'Despublicar' : 'Publicar curso'}</Button>}
            </div>
            {msg && <div className="mb-4"><Alert type="error">{msg}</Alert></div>}

            <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
                {TABS.map((t) => (
                    <button
                        key={t.id} disabled={isNew && t.id !== 'datos'} onClick={() => setTab(t.id)}
                        className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${tab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'datos' && (
                <CourseForm
                    key={course?.id ?? 'new'} course={course}
                    onSaved={(newId, created) => (created ? navigate(`/gestion/cursos/${newId}`, { replace: true }) : reload())}
                />
            )}
            {course && tab === 'contenido' && <CurriculumEditor course={course} onChange={reload} />}
            {course && tab === 'recompensas' && <RewardsPanel key={course.id} course={course} onChange={reload} />}
            {course && tab === 'alumnos' && <StudentsPanel courseId={course.id} />}
        </div>
    );
}