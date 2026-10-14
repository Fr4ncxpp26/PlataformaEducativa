import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { errorMessage } from '../lib/api';
import { Alert, Button, Field } from '../components/ui';
import GoogleButton from '../components/GoogleButton';
 
export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(params.get('error') === 'oauth' ? 'No se pudo iniciar sesión con Google' : '');
 
    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    };
 
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
            <div className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-8 shadow">
                <h1 className="text-2xl font-bold text-slate-800">Iniciar sesión</h1>
                {error && <Alert type="error">{error}</Alert>}
                <form onSubmit={onSubmit} className="space-y-4">
                    <Field label="Correo" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <Field label="Contraseña" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <Button type="submit" loading={loading} className="w-full">Entrar</Button>
                </form>
                <div className="text-center text-xs text-slate-400">o</div>
                <GoogleButton />
                <p className="text-center text-sm text-slate-600">
                    ¿No tienes cuenta? <Link to="/register" className="font-semibold text-indigo-600">Regístrate</Link>
                </p>
            </div>
        </div>
    );
}