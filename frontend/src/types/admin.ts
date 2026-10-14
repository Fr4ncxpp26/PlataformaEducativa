export interface AuditLog {
    id: string;
    action: string;
    entity: string;
    entity_id: string | null;
    details: unknown;
    ip: string | null;
    created_at: string;
    admin: { nombre: string } | null;
}

export interface AdminStats {
    users: { total: number; byRole: Record<string, number> };
    courses: { total: number; published: number };
    lessons: number;
    enrollments: number;
    certificates: number;
    tutorings: { programada: number; completada: number; cancelada: number };
    payments: { revenue: number; completados: number; pendientes: number };
    recent: AuditLog[];
}