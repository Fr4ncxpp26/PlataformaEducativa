import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';

export const createCourse = async (req: Request, res: Response) => {
    const { title, slug, level, price, subject_id } = req.body;
    const { data, error } = await supabase.from('courses').insert({
        title, slug, level, price, subject_id, teacher_id: req.user?.id
    }).select();
    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(data);
};

export const getCourses = async (req: Request, res: Response) => {
    const { data, error } = await supabase.from('courses').select('*, teacher:teacher_id(nombre)');
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json(data);
};

export const updateCourse = async (req: Request, res: Response) => {
    const { data, error } = await supabase.from('courses').update(req.body).eq('id', req.params.id).select();
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json(data);
};

export const deleteCourse = async (req: Request, res: Response) => {
    const { error } = await supabase.from('courses').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ message: 'Curso eliminado' });
};