import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Award, Printer, ShieldCheck } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { formatDate } from '../lib/format';
import { Alert, Button, Spinner } from '../components/ui';

interface Cert { folio: string; issue_date: string; course: string; instructor: string | null; student: string }

function Lookup() {
    const navigate = useNavigate();
    const [folio, setFolio] = useState('');
    const submit = (e: FormEvent) => { e.preventDefault(); navigate(`/verificar/${folio.trim()}`); };
    return (
        <form onSubmit={submit} className="mx-auto max-w-md space-y-4 rounded-2xl bg-white p-8 shadow">
            <h1 className="text-xl font-bold text-slate-800">Verificar certificado</h1>
            <p className="text-sm text-slate-500">Ingresa el folio impreso en el certificado.</p>
            <input value={folio} onChange={(e) => setFolio(e.target.value)} required placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
            <Button type="submit" className="w-full">Verificar</Button>
        </form>
    );
}

function Result({ id }: { id: string }) {
    const { data, error, loading } = useApi<Cert>(`/public/certificates/${id}`);
    if (loading) return <Spinner />;
    if (error || !data) return (
        <div className="mx-auto max-w-md space-y-3"><Alert type="error">{error || 'Certificado no encontrado'}</Alert><Link to="/verificar" className="text-sm font-semibold text-indigo-600">Probar con otro folio</Link></div>
    );
    return (
        <div className="mx-auto max-w-3xl space-y-4">
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-green-700 print:hidden"><ShieldCheck size={18} /> Certificado auténtico</div>
            <div className="rounded-2xl border-8 border-double border-indigo-200 bg-white p-10 text-center shadow-lg">
                <Award className="mx-auto text-indigo-600" size={48} />
                <p className="mt-2 text-sm uppercase tracking-[0.3em] text-slate-400">Escuela Digital</p>
                <h1 className="mt-4 text-3xl font-bold text-slate-800">Certificado de finalización</h1>
                <p className="mt-6 text-slate-500">Se otorga a</p>
                <p className="mt-1 text-4xl font-semibold text-indigo-700">{data.student}</p>
                <p className="mt-6 text-slate-500">por completar satisfactoriamente el curso</p>
                <p className="mt-1 text-2xl font-semibold text-slate-800">{data.course}</p>
                <div className="mt-8 flex flex-wrap justify-center gap-8 text-sm text-slate-500">
                    <div><p className="font-medium text-slate-700">{formatDate(data.issue_date)}</p><p>Fecha de emisión</p></div>
                    {data.instructor && <div><p className="font-medium text-slate-700">{data.instructor}</p><p>Instructor</p></div>}
                </div>
                <p className="mt-8 break-all text-xs text-slate-400">Folio de verificación: {data.folio}</p>
            </div>
            <div className="flex justify-center gap-3 print:hidden">
                <Button onClick={() => window.print()}><span className="flex items-center gap-1"><Printer size={16} /> Imprimir / guardar PDF</span></Button>
                <Link to="/dashboard" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Volver</Link>
            </div>
        </div>
    );
}

export default function VerifyCertificate() {
    const { id } = useParams();
    return <div className="min-h-screen bg-slate-50 px-4 py-12">{id ? <Result key={id} id={id} /> : <Lookup />}</div>;
}