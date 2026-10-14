// frontend/src/App.tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards';
import RoleRoute from './components/RoleRoute';
import AppLayout from './layouts/AppLayout';
import AdminLayout from './layouts/AdminLayout';
import SiteLayout from './layouts/SiteLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Catalog from './pages/Catalog';
import CourseDetail from './pages/CourseDetail';
import MyCourses from './pages/MyCourses';
import CoursePlayer from './pages/CoursePlayer';
import Achievements from './pages/Achievements';
import Leaderboard from './pages/Leaderboard';
import PublicProfile from './pages/PublicProfile';
import VerifyCertificate from './pages/VerifyCertificate';
import Tutoring from './pages/student/Tutoring';
import ManageCourses from './pages/manage/ManageCourses';
import CourseEditor from './pages/manage/CourseEditor';
import TeacherTutoring from './pages/teacher/TeacherTutoring';
import TutorDashboard from './pages/tutor/TutorDashboard';
import StudentDetail from './pages/tutor/StudentDetail';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminGuardianships from './pages/admin/AdminGuardianships';
import AdminSubjects from './pages/admin/AdminSubjects';
import AdminEnrollments from './pages/admin/AdminEnrollments';
import AdminCertificates from './pages/admin/AdminCertificates';
import AdminAchievements from './pages/admin/AdminAchievements';
import AdminTutorings from './pages/admin/AdminTutorings';
import AdminPayments from './pages/admin/AdminPayments';
import AdminAudit from './pages/admin/AdminAudit';

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    {/* Público */}
                    <Route path="/" element={<Landing />} />
                    <Route path="/verificar" element={<VerifyCertificate />} />
                    <Route path="/verificar/:id" element={<VerifyCertificate />} />
                    <Route element={<SiteLayout />}>
                        <Route path="/cursos" element={<Catalog />} />
                        <Route path="/cursos/:slug" element={<CourseDetail />} />
                    </Route>

                    <Route element={<PublicOnlyRoute />}>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                    </Route>

                    <Route element={<ProtectedRoute />}>
                        <Route element={<AppLayout />}>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/dashboard/perfil" element={<Profile />} />
                            <Route path="/ranking" element={<Leaderboard />} />
                            <Route path="/perfil/:id" element={<PublicProfile />} />

                            {/* Alumno */}
                            <Route element={<RoleRoute roles={['alumno_adulto', 'alumno_menor']} />}>
                                <Route path="/mis-cursos" element={<MyCourses />} />
                                <Route path="/aprender/:slug" element={<CoursePlayer />} />
                                <Route path="/logros" element={<Achievements />} />
                                <Route path="/tutorias" element={<Tutoring />} />
                            </Route>

                            {/* Profesor (y admin para cursos) */}
                            <Route element={<RoleRoute roles={['admin', 'profesor']} />}>
                                <Route path="/gestion/cursos" element={<ManageCourses />} />
                                <Route path="/gestion/cursos/:id" element={<CourseEditor />} />
                            </Route>
                            <Route element={<RoleRoute roles={['profesor']} />}>
                                <Route path="/profesor/tutorias" element={<TeacherTutoring />} />
                            </Route>

                            {/* Padre / tutor */}
                            <Route element={<RoleRoute roles={['padre_tutor']} />}>
                                <Route path="/tutor" element={<TutorDashboard />} />
                                <Route path="/tutor/alumno/:id" element={<StudentDetail />} />
                            </Route>
                        </Route>

                        {/* Administrador */}
                        <Route element={<RoleRoute roles={['admin']} />}>
                            <Route path="/admin" element={<AdminLayout />}>
                                <Route index element={<AdminDashboard />} />
                                <Route path="usuarios" element={<AdminUsers />} />
                                <Route path="vinculaciones" element={<AdminGuardianships />} />
                                <Route path="materias" element={<AdminSubjects />} />
                                <Route path="cursos" element={<ManageCourses />} />
                                <Route path="inscripciones" element={<AdminEnrollments />} />
                                <Route path="certificados" element={<AdminCertificates />} />
                                <Route path="logros" element={<AdminAchievements />} />
                                <Route path="tutorias" element={<AdminTutorings />} />
                                <Route path="pagos" element={<AdminPayments />} />
                                <Route path="registros" element={<AdminAudit />} />
                            </Route>
                        </Route>
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}