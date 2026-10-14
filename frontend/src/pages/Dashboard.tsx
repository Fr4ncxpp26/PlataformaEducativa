// frontend/src/pages/Dashboard.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { Avatar } from '../components/ui';
import { ROL_LABEL } from '../types/user';
import StudentDashboard from './student/StudentDashboard';
import TeacherDashboard from './teacher/TeacherDashboard';

// Cada rol aterriza en su propio panel
export default function Dashboard() {
    const { user } = useAuth();
    if (!user) return null;
    if (user.rol === 'admin') return <Navigate to="/admin" replace />;
    if (user.rol === 'padre_tutor') return <Navigate to="/tutor" replace />;
    if (user.rol === 'profesor') return <TeacherDashboard />;
    if (user.rol === 'alumno_adulto' || user.rol === 'alumno_menor') return <StudentDashboard />;

    return (
        <div className="flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm">
            <Avatar nombre={user.nombre} url={user.avatar_url} size="h-16 w-16 text-2xl" />
            <div><p className="font-semibold text-slate-800">{user.nombre}</p><p className="text-sm text-slate-500">{ROL_LABEL[user.rol]}</p></div>
        </div>
    );
}