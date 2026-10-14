export type LessonType = 'video' | 'lectura' | 'pdf' | 'interactivo' | 'ejercicio' | 'quiz' | 'examen_unidad' | 'examen_final';

export interface CourseSummary {
    id: string; title: string; slug: string; description: string | null; level: string;
    image_url: string | null; price: number | string | null;
    subject: { name: string } | null; teacher: { nombre: string } | null;
}

export interface QuestionOption { id: string; text: string; is_correct: boolean }
export interface Question { id: string; prompt: string; explanation: string | null; difficulty: number; options: QuestionOption[] }
export interface Lesson {
    id: string; title: string; type: LessonType; content_url: string | null; text_content: string | null;
    position: number; is_free: boolean; is_published: boolean; points: number; duration_minutes: number | null;
    pass_score: number | null; max_attempts: number | null; questions?: Question[];
}
export interface CourseModule { id: string; title: string; position: number; is_published: boolean; lessons: Lesson[] }
export interface CourseFull {
    id: string; title: string; slug: string; description: string | null; level: string; price: number | null;
    subject_id: string | null; teacher_id: string | null; image_url: string | null; is_published: boolean;
    completion_points: number; pass_score: number; sequential_units: boolean; modules: CourseModule[];
}
export interface Achievement { id: string; name: string; description: string | null; icon_url: string | null }

// ----- Alumno -----
export interface OutlineLesson { id: string; title: string; type: LessonType; position: number; duration_minutes: number | null; points: number; is_free: boolean; locked?: string | null }
export interface OutlineModule { id: string; title: string; position: number; lessons: OutlineLesson[] }
export interface Outline {
    course: { id: string; title: string; slug: string; description: string | null; pass_score: number; completion_points: number; sequential_units: boolean; teacher: { nombre: string } | null };
    modules: OutlineModule[]; completedLessonIds: string[]; certificateId: string | null;
}
export interface LessonData {
    lesson: { id: string; title: string; type: LessonType; content_url: string | null; text_content: string | null; points: number; duration_minutes: number | null };
    questions: { id: string; prompt: string; options: { id: string; text: string }[] }[] | null;
    passScore: number; maxAttempts: number | null; attemptsUsed: number; lastAttempt: { score: number; passed: boolean } | null;
}
export interface EarnedAchievement { id: string; name: string; icon_url: string | null }
export interface CompletionResult {
    completed: boolean; newlyCompleted: boolean; done: number; total: number;
    certificateId?: string; points?: number; achievements?: EarnedAchievement[];
}
export interface Reward { firstTime: boolean; pointsEarned: number; achievements: EarnedAchievement[]; course: CompletionResult }
export interface QuizResult {
    score: number; passed: boolean; correct: number; total: number; passScore: number; attemptsLeft: number | null;
    review: { questionId: string; correct: boolean; explanation: string | null; correctOptionId: string | null }[];
    reward: Reward | null;
}