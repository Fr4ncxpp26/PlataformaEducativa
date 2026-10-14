// frontend/src/types/community.ts
export interface RankRow { id: string; nombre: string; avatar_url: string | null; points: number; streak: number; rank: number }
export interface LeaderboardData {
    period: 'week' | 'all'; data: RankRow[];
    me: { id: string; eligible: boolean; visible: boolean; rank: number | null };
}

interface PublicBase { id: string; nombre: string; avatar_url: string | null; rol: string; headline: string | null; bio: string | null }
export type PublicProfileData =
    | { kind: 'student'; profile: PublicBase; preview: boolean;
        stats: { points: number; streak: number; maxStreak: number; lessons: number; certificates: number };
        courses: { title: string; slug: string; percent: number }[];
        certificates: { id: string; issue_date: string; course: string }[];
        badges: { id: string; name: string }[] }
    | { kind: 'teacher'; profile: PublicBase; preview: boolean;
        courses: { id: string; title: string; slug: string; level: string; image_url: string | null; students: number }[] }
    | { kind: 'other'; profile: PublicBase; preview: boolean };