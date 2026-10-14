import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';

export const recordProgress = async (req: Request, res: Response) => {
    const { lesson_id, time_spent_seconds, completed } = req.body;
    const { data, error } = await supabase.from('progress').upsert({
        student_id: req.user?.id,
        lesson_id,
        time_spent_seconds,
        completed,
        completed_at: completed ? new Date().toISOString() : null
    }, { onConflict: 'student_id, lesson_id' }).select();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json(data);
};

export const getMyProgress = async (req: Request, res: Response) => {
    const { data, error } = await supabase.from('progress').select('*, lesson:lesson_id(title)').eq('student_id', req.user?.id);
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json(data);
};

export const deleteProgress = async (req: Request, res: Response) => {
    const { error } = await supabase.from('progress').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ message: 'Progreso reseteado' });
};