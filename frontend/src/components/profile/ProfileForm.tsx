import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../context/useAuth';
import { errorMessage } from '../../lib/api';
import { COUNTRIES } from '../../lib/profile';
import { Alert, Avatar, Button, Field } from '../ui';
import { TextAreaField } from '../admin/AdminUI';
import type { AuthUser } from '../../types/user';
import { FileUploader } from '../FileUploader';

const orNull = (v: string) => v.trim() || null;

export default function ProfileForm({ user }: { user: AuthUser }) {
    const { updateProfile } = useAuth();
    const init = {
        nombre: user.nombre,
        headline: user.headline ?? '',
        bio: user.bio ?? '',
        telefono: user.telefono ?? '',
        pais: user.pais ?? '',
        avatar: user.avatar_url ?? '',
    };

    const [f, setF] = useState(init);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

    const set = (k: keyof typeof init) => (e: { target: { value: string } }) => {
        setF((s) => ({ ...s, [k]: e.target.value }));
        setMsg(null);
    };

    const dirty = (Object.keys(init) as (keyof typeof init)[]).some((k) => f[k] !== init[k]);
    const teacher = user.rol === 'profesor';

    const onSave = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMsg(null);
        try {
            await updateProfile({
                nombre: f.nombre.trim(),
                headline: orNull(f.headline),
                bio: orNull(f.bio),
                telefono: orNull(f.telefono),
                pais: orNull(f.pais),
                avatar_url: orNull(f.avatar),
            });
            setMsg({ type: 'success', text: 'Perfil actualizado' });
        } catch (err) {
            setMsg({ type: 'error', text: errorMessage(err) });
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={onSave} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
                <h2 className="font-semibold text-slate-800">Información personal</h2>
                <p className="text-sm text-slate-500">
                    {teacher ? 'Esta información se muestra a tus alumnos.' : 'Tu perfil es privado: solo tú y tu tutor vinculado ven estos datos.'}
                </p>
            </div>

            {msg && <Alert type={msg.type}>{msg.text}</Alert>}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar nombre={f.nombre || user.nombre} url={f.avatar.startsWith('https://') ? f.avatar : null} size="h-16 w-16 text-2xl" />
                <div className="flex-1">
                    <FileUploader
                        label="Foto de Perfil (Avatar)"
                        folder="avatars"
                        accept="image"
                        value={f.avatar}
                        helperText="Sube una foto cuadrada (JPG, PNG o WEBP)."
                        onChange={(url) => {
                            setF((s) => ({ ...s, avatar: url }));
                            setMsg(null);
                        }}
                    />
                </div>
                {f.avatar && (
                    <button
                        type="button"
                        onClick={() => {
                            setF((s) => ({ ...s, avatar: '' }));
                            setMsg(null);
                        }}
                        className="self-start text-xs text-slate-500 hover:text-red-600 sm:self-center"
                    >
                        Quitar foto
                    </button>
                )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nombre completo" required minLength={2} maxLength={100} value={f.nombre} onChange={set('nombre')} />
                <Field
                    label={teacher ? 'Titular profesional' : 'Titular (opcional)'}
                    maxLength={120}
                    placeholder={teacher ? 'Maestra de Matemáticas · 10 años de experiencia' : 'Estudiante de preparatoria'}
                    value={f.headline}
                    onChange={set('headline')}
                />
                <Field label="Teléfono" type="tel" placeholder="+52 961 000 0000" value={f.telefono} onChange={set('telefono')} />
                <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">País</span>
                    <input
                        list="countries"
                        value={f.pais}
                        onChange={set('pais')}
                        maxLength={60}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                    <datalist id="countries">
                        {COUNTRIES.map((c) => (
                            <option key={c} value={c} />
                        ))}
                    </datalist>
                </label>
            </div>

            <div>
                <TextAreaField
                    label="Biografía"
                    rows={4}
                    maxLength={500}
                    placeholder="Cuéntanos sobre ti, tus metas o tu experiencia…"
                    value={f.bio}
                    onChange={set('bio')}
                />
                <p className="mt-1 text-right text-xs text-slate-400">{f.bio.length}/500</p>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                {dirty && <span className="text-xs text-amber-600">Tienes cambios sin guardar</span>}
                <Button
                    type="button"
                    variant="ghost"
                    disabled={!dirty}
                    onClick={() => {
                        setF(init);
                        setMsg(null);
                    }}
                >
                    Descartar
                </Button>
                <Button type="submit" loading={saving} disabled={!dirty}>
                    Guardar cambios
                </Button>
            </div>
        </form>
    );
}