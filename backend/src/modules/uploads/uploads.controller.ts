import { Request, Response, NextFunction } from 'express';
import {
    uploadBufferToCloudinary,
    deleteFromCloudinary,
    CloudinaryFolder,
} from '../../config/cloudinary';

const VALID_FOLDERS: CloudinaryFolder[] = [
    'avatars',
    'courses/covers',
    'courses/pdfs',
    'courses/lessons',
    'achievements',
    'tutorings',
    'certificates',
];

export const uploadSingleFile = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No se recibió ningún archivo.' });
            return;
        }

        const requestedFolder = (req.body.folder as CloudinaryFolder) || 'courses/lessons';
        const folder: CloudinaryFolder = VALID_FOLDERS.includes(requestedFolder)
            ? requestedFolder
            : 'courses/lessons';

        // Se verifica 'rol' (español) y 'role' (inglés), normalizado a minúsculas
        const user = (req as any).user;
        const userRole = (user?.rol).toLowerCase();

        if (
            ['courses/covers', 'courses/pdfs', 'courses/lessons', 'achievements', 'certificates'].includes(folder) &&
            userRole !== 'admin' && userRole !== 'profesor'
        ) {
            res.status(403).json({ error: 'No tienes permisos para subir archivos a esta sección.' });
            return;
        }

        if (req.body.previousPublicId) {
            await deleteFromCloudinary(req.body.previousPublicId);
        }

        const uploaded = await uploadBufferToCloudinary(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            folder
        );

        res.status(201).json({
            message: 'Archivo subido correctamente',
            file: uploaded,
        });
    } catch (error) {
        next(error);
    }
};

export const removeUploadedFile = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { publicId } = req.body;
        if (!publicId) {
            res.status(400).json({ error: 'Se requiere el publicId del archivo.' });
            return;
        }
        await deleteFromCloudinary(publicId);
        res.json({ message: 'Archivo eliminado correctamente' });
    } catch (error) {
        next(error);
    }
};