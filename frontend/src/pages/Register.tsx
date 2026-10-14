import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { errorMessage } from '../lib/api';
import { Alert, Button, Field } from '../components/ui';
import GoogleButton from '../components/GoogleButton';

type RolReg = 'alumno_adulto' | 'padre_tutor';

export default function Register() {
    const { register } = useAuth();
    const [params] = useSearchParams();
    const code = (params.get('codigo') ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    // Enlace de invitación de un alumno: registro de tutor con el código guardado para canjearlo al entrar
    if (code.length === 8) localStorage.setItem('pending_invite', code);
    const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: (params.get('rol') === 'padre_tutor' ? 'padre_tutor' : 'alumno_adulto') as RolReg });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try { setSuccess(await register(form)); }
        catch (err) { setError(errorMessage(err)); }
        finally { setLoading(false); }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
            <div className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-8 shadow">
                <h1 className="text-2xl font-bold text-slate-800">{form.rol === 'padre_tutor' ? 'Registro de tutores' : 'Crear cuenta'}</h1>
                {code.length === 8 && <Alert type="success">Un alumno te invitó a ser su tutor. Al iniciar sesión podrás vincularte con el código <b>{code}</b>.</Alert>}
                {error && <Alert type="error">{error}</Alert>}
                {success ? (
                    <>
                        <Alert type="success">{success}</Alert>
                        <Link to="/login" className="block text-center text-sm font-semibold text-indigo-600">Ir a iniciar sesión</Link>
                    </>
                ) : (
                    <>
                        <form onSubmit={onSubmit} className="space-y-4">
                            <Field label="Nombre" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                            <Field label="Correo" type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                            <Field label="Contraseña" type="password" required autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                            <p className="-mt-2 text-xs text-slate-500">Mín. 8 caracteres, una mayúscula, un número y un símbolo.</p>
                            <label className="block">
                                <span className="mb-1 block text-sm font-medium text-slate-700">Soy…</span>
                                <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as RolReg })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                                    <option value="alumno_adulto">Alumno (mayor de edad)</option>
                                    <option value="padre_tutor">Padre / Tutor</option>
                                </select>
                            </label>
                            <Button type="submit" loading={loading} className="w-full">Registrarme</Button>
                        </form>
                        <div className="text-center text-xs text-slate-400">o</div>
                        <GoogleButton />
                    </>
                )}
                <p className="text-center text-sm text-slate-600">¿Ya tienes cuenta? <Link to="/login" className="font-semibold text-indigo-600">Inicia sesión</Link></p>
            </div>
        </div>
    );
}