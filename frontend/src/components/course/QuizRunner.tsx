import { useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { Alert, Button } from '../ui';
import type { LessonData, QuizResult } from '../../types/course';

const INTRO: Record<string, string> = {
    ejercicio: 'Práctica: no afecta tu calificación y verás la retroalimentación al terminar.',
    quiz: 'Test de la lección.',
    examen_unidad: 'Examen de unidad.',
    examen_final: 'Examen final del curso.',
};

interface Props {
    lessonId: string; kind: string; data: LessonData; onResult: (r: QuizResult) => void;
}

export default function QuizRunner({ lessonId, kind, data, onResult }: Props) {
    const questions = data.questions ?? [];
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [result, setResult] = useState<QuizResult | null>(null);
    const [used, setUsed] = useState(data.attemptsUsed);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    if (questions.length === 0) return <Alert type="error">Esta evaluación aún no tiene preguntas.</Alert>;
    const practice = kind === 'ejercicio';
    const noAttempts = data.maxAttempts !== null && used >= data.maxAttempts && !result;
    const ready = questions.every((q) => answers[q.id]);

    const submit = async () => {
        setBusy(true); setError('');
        try {
            const r = await api<QuizResult>(`/learning/lessons/${lessonId}/quiz`, { method: 'POST', body: { answers } });
            setResult(r); setUsed((u) => u + 1); onResult(r);
        } catch (e) { setError(errorMessage(e)); }
        finally { setBusy(false); }
    };
    const retry = () => { setResult(null); setAnswers({}); };
    const review = (qid: string) => result?.review.find((r) => r.questionId === qid);

    return (
        <div className="space-y-5">
            <p className="text-sm text-slate-500">
                {INTRO[kind] ?? ''}{!practice && ` Necesitas ${data.passScore}% para aprobar.`}
                {data.maxAttempts !== null && ` Intentos: ${Math.min(used, data.maxAttempts)}/${data.maxAttempts}.`}
                {data.lastAttempt && !result && ` Último intento: ${data.lastAttempt.score}%.`}
            </p>
            {error && <Alert type="error">{error}</Alert>}
            {noAttempts && <Alert type="error">Ya usaste todos tus intentos para esta evaluación.</Alert>}

            {questions.map((q, i) => {
                const rv = review(q.id);
                return (
                    <fieldset key={q.id} disabled={!!result || noAttempts} className={`rounded-xl border p-4 ${rv ? (rv.correct ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50') : 'border-slate-200 bg-white'}`}>
                        <legend className="px-1 text-sm font-semibold text-slate-800">{i + 1}. {q.prompt}</legend>
                        <div className="mt-2 space-y-2">
                            {q.options.map((o) => (
                                <label key={o.id} className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 ${rv?.correctOptionId === o.id ? 'font-semibold text-green-700' : ''}`}>
                                    <input type="radio" name={q.id} checked={answers[q.id] === o.id} onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))} />
                                    {o.text}
                                </label>
                            ))}
                        </div>
                        {rv && !rv.correct && rv.explanation && <p className="mt-2 text-xs text-red-700">💡 {rv.explanation}</p>}
                    </fieldset>
                );
            })}

            {result ? (
                <div className={`rounded-xl p-5 ${result.passed ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                    <p className="text-lg font-bold">{practice ? 'Práctica completada' : result.passed ? '¡Aprobado!' : 'Aún no alcanzas la calificación'} — {result.score}%</p>
                    <p className="text-sm">{result.correct} de {result.total} correctas{practice ? '' : ` (mínimo ${result.passScore}%)`}.{result.attemptsLeft !== null && !result.passed ? ` Te quedan ${result.attemptsLeft} intentos.` : ''}</p>
                    {!result.passed && result.attemptsLeft !== 0 && <Button className="mt-3" onClick={retry}>Intentar de nuevo</Button>}
                </div>
            ) : !noAttempts && (
                <Button onClick={submit} loading={busy} disabled={!ready}>Enviar respuestas</Button>
            )}
        </div>
    );
}