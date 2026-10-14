import { Flame } from 'lucide-react';
import type { WeekDay } from '../../types/learning';

const LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

// Racha actual + calendario de los últimos 7 días
export default function WeekStreak({ streak, week }: { streak: number; week: WeekDay[] }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
                <span className={`rounded-xl p-2 ${streak > 0 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}><Flame /></span>
                <div>
                    <p className="text-2xl font-bold text-slate-800">{streak} {streak === 1 ? 'día' : 'días'}</p>
                    <p className="text-xs text-slate-500">{streak > 0 ? 'Racha de estudio' : 'Estudia hoy para iniciar tu racha'}</p>
                </div>
            </div>
            <div className="mt-4 flex justify-between">
                {week.map((d) => (
                    <div key={d.date} className="flex flex-col items-center gap-1">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${d.active ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{d.active ? '✓' : ''}</span>
                        <span className="text-[10px] text-slate-400">{LETTERS[new Date(`${d.date}T12:00:00`).getDay()]}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}