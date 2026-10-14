import { Request, Response, NextFunction } from 'express';
import { Rol } from '../types/express';

export const requireRole = (allowedRoles: Rol[]) => (req: Request, res: Response, next: NextFunction) => {
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
        return res.status(403).json({ error: 'Acceso prohibido' }); // sin revelar roles internos
    }
    next();
};