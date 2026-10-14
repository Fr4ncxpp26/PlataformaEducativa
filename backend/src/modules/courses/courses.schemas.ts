import { z } from 'zod';

const uuid = z.uuid();
const text = (max: number) => z.string().trim().max(max).nullable().optional();
const httpsUrl = z.url().refine((u) => u.startsWith('https://'), 'Debe ser https').nullable().optional();
// Tipos de lección que se responden con preguntas
export const QUIZ_TYPES: string[] = ['quiz', 'ejercicio', 'examen_unidad', 'examen_final'];
const nonEmpty = (d: object) => Object.keys(d).length > 0;

export const courseSchema = z.strictObject({
    title: z.string().trim().min(3).max(200),
    slug: z.string().trim().toLowerCase().max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug inválido (usa-minusculas-y-guiones)'),
    description: text(5000),
    level: z.enum(['ninos', 'secundaria', 'preparatoria', 'universidad', 'profesional']),
    price: z.number().min(0).max(1_000_000).optional(),
    subject_id: uuid.nullable().optional(),
    teacher_id: uuid.nullable().optional(), // solo admin
    image_url: httpsUrl,
    is_published: z.boolean().optional(),
    completion_points: z.number().int().min(0).max(100000).optional(),
    pass_score: z.number().int().min(1).max(100).optional(),
    sequential_units: z.boolean().optional(),
});
export const courseUpdateSchema = courseSchema.partial().refine(nonEmpty, 'Nada que actualizar');

export const moduleSchema = z.strictObject({
    title: z.string().trim().min(2).max(200),
    is_published: z.boolean().optional(),
});
export const moduleUpdateSchema = moduleSchema.partial().refine(nonEmpty, 'Nada que actualizar');

export const lessonSchema = z.strictObject({
    title: z.string().trim().min(2).max(200),
    type: z.enum(['video', 'lectura', 'pdf', 'interactivo', 'ejercicio', 'quiz', 'examen_unidad', 'examen_final']),
    content_url: httpsUrl,
    text_content: text(50000),
    is_free: z.boolean().optional(),
    is_published: z.boolean().optional(),
    points: z.number().int().min(0).max(1000).optional(),
    duration_minutes: z.number().int().min(0).max(1000).nullable().optional(),
    pass_score: z.number().int().min(1).max(100).nullable().optional(), // nota mínima propia (exámenes)
    max_attempts: z.number().int().min(1).max(50).nullable().optional(),  // null = ilimitados
});
export const lessonUpdateSchema = lessonSchema.partial().refine(nonEmpty, 'Nada que actualizar');

const questionBase = z.strictObject({
    prompt: z.string().trim().min(3).max(1000),
    explanation: text(2000),
    difficulty: z.number().int().min(1).max(5).optional(),
    options: z.array(z.strictObject({
        text: z.string().trim().min(1).max(500),
        is_correct: z.boolean(),
    })).min(2, 'Mínimo 2 opciones').max(6, 'Máximo 6 opciones'),
});
export const questionSchema = questionBase.refine(
    (q) => q.options.filter((o) => o.is_correct).length === 1,
    'Debe haber exactamente una respuesta correcta',
);

export const achievementSchema = z.strictObject({
    name: z.string().trim().min(2).max(100),
    description: text(500),
    icon_url: httpsUrl,
});
export const achievementUpdateSchema = achievementSchema.partial().refine(nonEmpty, 'Nada que actualizar');

export const moveSchema = z.strictObject({ direction: z.enum(['up', 'down']) });
export const issueCertSchema = z.strictObject({ student_id: uuid });
export const completeSchema = z.strictObject({ time_spent_seconds: z.number().int().min(0).max(86400).optional() });
export const quizSubmitSchema = z.strictObject({ answers: z.record(z.string(), z.uuid()) });