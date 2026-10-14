import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Award, CheckCircle2, Circle, Download, ExternalLink, Lock, Trophy } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { embedUrl, isDirectVideo, isExam, isQuizType, lessonTypeLabel } from '../lib/course';
import { Alert, Button, Spinner } from '../components/ui';
import { Badge } from '../components/admin/AdminUI';
import QuizRunner from '../components/course/QuizRunner';
import type { LessonData, Outline, Reward } from '../types/course';

function RewardBanner({ reward, onClose }: { reward: Reward; onClose: () => void }) {
    const c = reward.course;
    const achievements = [...reward.achievements, ...(c.achievements ?? [])];
    return (
        <div className="relative rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-5">
            <button onClick={onClose} className="absolute right-3 top-2 text-slate-400 hover:text-slate-600" aria-label="Cerrar">×</button>
            {reward.pointsEarned > 0 && <p className="font-semibold text-amber-800">⭐ +{reward.pointsEarned} puntos</p>}
            {c.newlyCompleted && (
                <div className="mt-2 space-y-1">
                    <p className="flex items-center gap-2 font-bold text-green-800"><Trophy size={18} /> ¡Completaste el curso! +{c.points ?? 0} puntos de bono</p>
                    {c.certificateId && <Link to={`/verificar/${c.certificateId}`} className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:underline"><Award size={16} /> Ver mi certificado</Link>}
                </div>
            )}
            {achievements.length > 0 && <p className="mt-2 text-sm text-slate-700">🏆 Insignia desbloqueada: {achievements.map((a) => a.name).join(', ')}</p>}
        </div>
    );
}

function LessonContent({ data }: { data: LessonData['lesson'] }) {
    const url = data.content_url;
    const embed = url ? embedUrl(url) : null;
    const inline = data.type === 'video' && url && (embed || isDirectVideo(url));
    return (
        <div className="space-y-4">
            {url && data.type === 'video' && (embed
                ? <iframe src={embed} title={data.title} className="aspect-video w-full rounded-xl" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="no-referrer" />
                : isDirectVideo(url) ? <video src={url} controls className="aspect-video w-full rounded-xl bg-black" /> : null)}
            {url && !inline && (
                <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-slate-50">
                    {data.type === 'pdf' ? <><Download size={16} /> Descargar / abrir PDF</> : <><ExternalLink size={16} /> {data.type === 'interactivo' ? 'Abrir escenario interactivo' : 'Abrir recurso'}</>}
                </a>
            )}
            {/* Texto plano: nunca se interpreta como HTML (evita XSS) */}
            {data.text_content && <div className="whitespace-pre-wrap leading-relaxed text-slate-700">{data.text_content}</div>}
            {!url && !data.text_content && <p className="text-sm text-slate-400">Esta lección aún no tiene contenido.</p>}
        </div>
    );
}

export default function CoursePlayer() {
    const { slug } = useParams();
    const [params, setParams] = useSearchParams();
    const outline = useApi<Outline>(`/learning/courses/${slug}`);
    const [done, setDone] = useState<Set<string>>(new Set());
    const [certificateId, setCertificateId] = useState<string | null>(null);
    const [reward, setReward] = useState<Reward | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const o = outline.data;
    useEffect(() => {
        if (o) { setDone(new Set(o.completedLessonIds)); setCertificateId(o.certificateId); }
    }, [o]);

    const flat = useMemo(() => o?.modules.flatMap((m) => m.lessons) ?? [], [o]);
    const firstOpen = flat.find((l) => !done.has(l.id) && !l.locked) ?? flat[0];
    const currentId = params.get('leccion') ?? firstOpen?.id ?? null;
    const lesson = useApi<LessonData>(currentId ? `/learning/lessons/${currentId}` : null);

    if (!o) return outline.error ? <Alert type="error">{outline.error}</Alert> : <Spinner />;
    const percent = flat.length ? Math.round((flat.filter((l) => done.has(l.id)).length / flat.length) * 100) : 0;
    const idx = flat.findIndex((l) => l.id === currentId);
    const next = idx >= 0 ? flat[idx + 1] : undefined;

    const go = (id: string) => { setReward(null); setError(''); setParams({ leccion: id }); };
    const applyReward = (r: Reward) => {
        if (currentId) setDone((s) => new Set(s).add(currentId));
        if (r.course.certificateId) setCertificateId(r.course.certificateId);
        if (r.pointsEarned > 0 || r.course.newlyCompleted || r.achievements.length) setReward(r);
        outline.reload(); // recalcula desbloqueos de unidades y exámenes
    };

    const complete = async () => {
        setBusy(true); setError('');
        try { applyReward(await api<Reward>(`/learning/lessons/${currentId}/complete`, { method: 'POST', body: {} })); }
        catch (e) { setError(errorMessage(e)); }
        finally { setBusy(false); }
    };

    const L = lesson.data;
    const isDone = currentId ? done.has(currentId) : false;
    const nextLocked = next?.locked && !done.has(next.id);

    return (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="min-w-0 space-y-5">
                <div>
                    <Link to="/mis-cursos" className="text-sm text-slate-500 hover:text-indigo-600">← Mis cursos</Link>
                    <h1 className="mt-1 text-2xl font-bold text-slate-800">{o.course.title}</h1>
                </div>
                {reward && <RewardBanner reward={reward} onClose={() => setReward(null)} />}
                {error && <Alert type="error">{error}</Alert>}
                {lesson.error && <Alert type="error">{lesson.error}</Alert>}

                {!L && lesson.loading && <Spinner />}
                {flat.length === 0 && <p className="text-sm text-slate-400">Este curso aún no tiene lecciones publicadas.</p>}
                {L && (
                    <article className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl font-semibold text-slate-800">{L.lesson.title}</h2>
                            <Badge tone={isExam(L.lesson.type) ? 'purple' : 'blue'}>{lessonTypeLabel(L.lesson.type)}</Badge>
                            {isDone && <Badge tone="green">Completada</Badge>}
                        </div>

                        {isQuizType(L.lesson.type) && L.questions ? (
                            <QuizRunner key={L.lesson.id} lessonId={L.lesson.id} kind={L.lesson.type} data={L}
                                onResult={(r) => { if (r.passed && r.reward) applyReward(r.reward); }} />
                        ) : (
                            <>
                                <LessonContent data={L.lesson} />
                                {!isDone && <Button onClick={complete} loading={busy}>Marcar como completada (+{L.lesson.points} pts)</Button>}
                            </>
                        )}

                        {(isDone || next) && (
                            <div className="flex justify-end border-t border-slate-100 pt-4">
                                {next
                                    ? <Button variant={isDone ? 'primary' : 'ghost'} disabled={!!nextLocked} onClick={() => go(next.id)}>{nextLocked ? '🔒 Siguiente bloqueada' : 'Siguiente lección →'}</Button>
                                    : certificateId && <Link to={`/verificar/${certificateId}`} className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"><Award size={16} /> Ver certificado</Link>}
                            </div>
                        )}
                    </article>
                )}
            </div>

            <aside className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-6">
                <div>
                    <div className="mb-1 flex justify-between text-xs text-slate-500"><span>Tu progreso</span><span>{percent}%</span></div>
                    <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-500 transition-all" style={{ width: `${percent}%` }} /></div>
                </div>
                {certificateId && <Link to={`/verificar/${certificateId}`} className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700"><Award size={16} /> Certificado obtenido</Link>}
                <nav className="space-y-4">
                    {o.modules.map((m, mi) => {
                        const unitDone = m.lessons.length > 0 && m.lessons.every((l) => done.has(l.id));
                        return (
                            <div key={m.id}>
                                <p className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    <span>Unidad {mi + 1}: {m.title}</span>{unitDone && <span className="text-green-600">✓</span>}
                                </p>
                                <ul className="space-y-0.5">
                                    {m.lessons.map((l) => {
                                        const locked = !!l.locked && !done.has(l.id);
                                        return (
                                            <li key={l.id}>
                                                <button disabled={locked} title={l.locked ?? undefined} onClick={() => go(l.id)}
                                                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50 ${l.id === currentId ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                                                    {done.has(l.id) ? <CheckCircle2 size={16} className="shrink-0 text-green-600" /> : locked ? <Lock size={15} className="shrink-0 text-slate-400" /> : <Circle size={16} className="shrink-0 text-slate-300" />}
                                                    <span className="line-clamp-2">{l.title}</span>
                                                    {isExam(l.type) && <span className="ml-auto text-[10px] font-semibold uppercase text-purple-600">Examen</span>}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        );
                    })}
                </nav>
            </aside>
        </div>
    );
}