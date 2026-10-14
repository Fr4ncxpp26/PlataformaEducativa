import { Globe, ShieldCheck } from 'lucide-react';
import { Avatar } from '../ui';
import { Badge } from '../admin/AdminUI';
import { memberSince } from '../../lib/profile';
import { ROL_LABEL } from '../../types/user';
import type { AuthUser, ProfileData } from '../../types/user';
 
export default function ProfileHeader({ user, data }: { user: AuthUser; data: ProfileData }) {
    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-28 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500" />
            <div className="px-6 pb-6">
                <div className="-mt-12 flex flex-wrap items-end gap-4">
                    <div className="rounded-full border-4 border-white bg-white shadow"><Avatar nombre={user.nombre} url={user.avatar_url} size="h-24 w-24 text-3xl" /></div>
                    <div className="min-w-0 flex-1 pb-1">
                        <h1 className="truncate text-2xl font-bold text-slate-800">{user.nombre}</h1>
                        <p className="text-sm text-slate-500">{user.headline || user.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pb-2">
                        <Badge tone="indigo"><ShieldCheck size={12} className="mr-1" />{ROL_LABEL[user.rol]}</Badge>
                        {user.pais && <Badge tone="slate"><Globe size={12} className="mr-1" />{user.pais}</Badge>}
                        <Badge tone="slate">Miembro desde {memberSince(data.auth.created_at)}</Badge>
                    </div>
                </div>
                {user.bio && <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm text-slate-600">{user.bio}</p>}
                {data.summary.length > 0 && (
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {data.summary.map((s) => (
                            <div key={s.label} className="rounded-xl bg-slate-50 px-4 py-3">
                                <p className="text-xl font-bold text-slate-800">{s.value}</p>
                                <p className="text-xs text-slate-500">{s.label}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
 