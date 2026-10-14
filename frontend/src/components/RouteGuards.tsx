import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { Spinner } from './ui';
 
export function ProtectedRoute() {
    const { user, loading } = useAuth();
    if (loading) return <Spinner />;
    return user ? <Outlet /> : <Navigate to="/login" replace />;
}
 
export function PublicOnlyRoute() {
    const { user, loading } = useAuth();
    if (loading) return <Spinner />;
    return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}