import type { CourseSummary } from './course';

export interface Stats { points: number; streak: number; maxStreak: number; lessons: number; courses: number; perfect: number }
export interface WeekDay { date: string; active: boolean }
export interface MyCourseRow {
    enrolled_at: string; completed: number; total: number; percent: number; certificate_id: string | null;
    course: { id: string; title: string; slug: string; image_url: string | null; is_published: boolean; teacher: { nombre: string } | null };
}
export interface TutorInfo { id: string; nombre: string; avatar_url: string | null }
export interface UpcomingSession { id: string; scheduled_at: string; meeting_url: string | null; teacher: { nombre: string } | null }
export interface StudentDashboardData {
    stats: Stats; week: WeekDay[]; courses: MyCourseRow[]; tutors: TutorInfo[]; sessions: UpcomingSession[];
    badges: { id: string; name: string; icon_url: string | null }[]; suggested: CourseSummary[];
}
export interface CatalogBadge { id: string; name: string; description: string | null; trigger_type: string; threshold: number; value: number; earned: boolean }
export interface GamificationData {
    stats: Stats; week: WeekDay[]; catalog: CatalogBadge[];
    earned: { awarded_at: string; achievement: { id: string; name: string; description: string | null; course: { title: string } | null } }[];
}

export interface TutoringSession {
    id: string; scheduled_at: string; status: 'programada' | 'completada' | 'cancelada';
    meeting_url: string | null; notes: string | null;
    student?: { nombre: string } | null; teacher?: { nombre: string } | null;
}
export interface TeacherCard { id: string; nombre: string; avatar_url: string | null; days: number[] }
export interface Availability { id: string; day_of_week: number; start_time: string; end_time: string }

export interface GuardianStudentRow { id: string; nombre: string; avatar_url: string | null; rol: string; points: number; streak: number; courses: number; avgPercent: number }
export interface GuardianStudentDetail {
    profile: { id: string; nombre: string; avatar_url: string | null; rol: string };
    stats: Stats; week: WeekDay[]; courses: MyCourseRow[]; studyMinutes: number;
    attempts: { score: number; passed: boolean; attempt: number; created_at: string; lesson: string; type: string; course: string }[];
    badges: { awarded_at: string; name: string }[];
}
export interface TeacherOverview {
    courses: { id: string; title: string; slug: string; is_published: boolean; students: number; graduates: number }[];
    totals: { courses: number; published: number; students: number; graduates: number; upcoming: number };
}