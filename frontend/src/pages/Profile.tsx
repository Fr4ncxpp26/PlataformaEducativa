import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useapi';
import { useAuth } from '../context/useAuth';
import { Alert, Spinner } from '../components/ui';
import ProfileHeader from '../components/profile/ProfileHeader';
import ProfileForm from '../components/profile/ProfileForm';
import SecurityPanel from '../components/profile/SecurityPanel';
import PrivacyPanel from '../components/profile/PrivacyPanel';
import type { ProfileData } from '../types/user';
 
const TABS = [
    { id: 'perfil', label: 'Perfil' },
    { id: 'seguridad', label: 'Seguridad' },
    { id: 'privacidad', label: 'Privacidad y datos' },
] as const;
type Tab = (typeof TABS)[number]['id'];
 
export default function Profile() {
    const { user } = useAuth();
    const { data, error, loading } = useApi<ProfileData>('/users/me');
    const [params] = useSearchParams();
    const initial = TABS.find((t) => t.id === params.get('tab'))?.id ?? 'perfil';
    const [tab, setTab] = useState<Tab>(initial);
 
    if (!user) return null;
    if (!data) return error ? <Alert type="error">{error}</Alert> : loading ? <Spinner /> : null;
 
    return (
        <div className="space-y-6">
            <ProfileHeader user={user} data={data} />
            <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
                {TABS.map((t) => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${tab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                        {t.label}
                    </button>
                ))}
            </div>
            {tab === 'perfil' && <ProfileForm key={user.id} user={user} />}
            {tab === 'seguridad' && <SecurityPanel auth={data.auth} />}
            {tab === 'privacidad' && <PrivacyPanel user={user} auth={data.auth} />}
        </div>
    );
}
 