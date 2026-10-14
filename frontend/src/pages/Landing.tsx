import { Link, Navigate } from 'react-router-dom';
import { Award, Flame, GraduationCap, Users } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { useApi } from '../hooks/useapi';
import CourseCard from '../components/course/CourseCard';
import type { CourseSummary } from '../types/course';

const FEATURES = [
    { icon: GraduationCap, title: 'Cursos por unidades', text: 'Lecturas, PDFs, ejercicios y exámenes de unidad hasta llegar al examen final.' },
    { icon: Flame, title: 'Rachas e insignias', text: 'Estudia cada día, gana puntos y desbloquea insignias.' },
    { icon: Award, title: 'Certificados verificables', text: 'Al terminar obtienes un certificado con folio público.' },
    { icon: Users, title: 'Tutores y tutorías', text: 'Tu tutor ve tu avance y puedes reservar sesiones 1 a 1 con profesores.' },
];

export default function Landing() {
    const { user, loading } = useAuth();
    const { data } = useApi<{ data: CourseSummary[] }>('/public/courses?pageSize=6');
    if (!loading && user) return <Navigate to="/dashboard" replace />;

    return (
        <div className="min-h-screen bg-white">
            <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
                <span className="text-lg font-bold text-indigo-600">Escuela Digital</span>
                <nav className="flex items-center gap-3 text-sm font-medium">
                    <Link to="/cursos" className="text-slate-600 hover:text-indigo-600">Catálogo</Link>
                    <Link to="/verificar" className="hidden text-slate-600 hover:text-indigo-600 sm:block">Verificar certificado</Link>
                    <Link to="/login" className="rounded-lg border border-slate-300 px-4 py-1.5 text-slate-700 hover:bg-slate-50">Entrar</Link>
                    <Link to="/register" className="rounded-lg bg-indigo-600 px-4 py-1.5 text-white hover:bg-indigo-700">Registrarme</Link>
                </nav>
            </header>

            <section className="bg-gradient-to-br from-indigo-600 to-purple-700 px-4 py-20 text-center text-white">
                <h1 className="mx-auto max-w-3xl text-4xl font-extrabold sm:text-5xl">No es un curso, es una escuela interactiva</h1>
                <p className="mx-auto mt-4 max-w-xl text-indigo-100">Aprende a tu ritmo con cursos creados por profesores, evaluaciones, rachas y acompañamiento de tu tutor.</p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <Link to="/register" className="rounded-lg bg-white px-6 py-3 font-semibold text-indigo-700 hover:bg-indigo-50">Soy alumno</Link>
                    <Link to="/register?rol=padre_tutor" className="rounded-lg border border-white/60 px-6 py-3 font-semibold text-white hover:bg-white/10">Soy padre o tutor</Link>
                </div>
            </section>

            <section className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
                {FEATURES.map(({ icon: Icon, title, text }) => (
                    <div key={title} className="rounded-xl border border-slate-200 p-5">
                        <Icon className="text-indigo-600" />
                        <h3 className="mt-3 font-semibold text-slate-800">{title}</h3>
                        <p className="mt-1 text-sm text-slate-500">{text}</p>
                    </div>
                ))}
            </section>

            <section className="mx-auto max-w-6xl px-4 pb-16">
                <div className="mb-5 flex items-center justify-between"><h2 className="text-2xl font-bold text-slate-800">Cursos disponibles</h2><Link to="/cursos" className="text-sm font-semibold text-indigo-600">Ver catálogo completo →</Link></div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{(data?.data ?? []).map((c) => <CourseCard key={c.id} c={c} />)}</div>
                {data && data.data.length === 0 && <p className="text-center text-sm text-slate-400">Pronto publicaremos los primeros cursos.</p>}
            </section>
        </div>
    );
}