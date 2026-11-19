export type Tone = 'green' | 'red' | 'amber' | 'blue' | 'slate' | 'indigo' | 'purple';

const STATUS_TONE: Record<string, Tone> = {
    completado: 'green', completada: 'green', programada: 'blue', pendiente: 'amber',
    fallido: 'red', cancelada: 'red', reembolsado: 'purple',
    crear: 'green', editar: 'blue', eliminar: 'red', suspender: 'amber', reactivar: 'green',
    admin: 'purple', profesor: 'indigo', editor: 'indigo', padre_tutor: 'blue',
};

export const statusTone = (status: string): Tone => STATUS_TONE[status] ?? 'slate';
