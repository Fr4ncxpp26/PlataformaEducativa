import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';

export const createPaymentRecord = async (req: Request, res: Response) => {
    const { course_id, amount, stripe_payment_intent } = req.body;
    const { data, error } = await supabase.from('payments').insert({
        student_id: req.user?.id,
        course_id,
        amount,
        stripe_payment_intent
    }).select();
    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(data);
};

export const getMyPayments = async (req: Request, res: Response) => {
    const { data, error } = await supabase.from('payments').select('*, course:course_id(title)').eq('student_id', req.user?.id);
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json(data);
};

export const updatePaymentStatus = async (req: Request, res: Response) => {
    const { status } = req.body; // status ENUM: 'pendiente', 'completado', 'fallido', 'reembolsado'
    const { data, error } = await supabase.from('payments').update({ status }).eq('id', req.params.id).select();
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json(data);
};

export const deletePaymentRecord = async (req: Request, res: Response) => {
    const { error } = await supabase.from('payments').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ message: 'Registro de pago eliminado' });
};