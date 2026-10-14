import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import type { Rol } from '../types/user';

// Usar DENTRO de <ProtectedRoute>. La seguridad real está en el backend; esto solo evita pantallas vacías.
export default function RoleRoute({ roles }: { roles: Rol[] }) {
    const { user } = useAuth();
    return user && roles.includes(user.rol) ? <Outlet /> : <Navigate to="/dashboard" replace />;
}