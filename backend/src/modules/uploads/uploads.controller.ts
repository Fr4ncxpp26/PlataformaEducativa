import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
    uploadBufferToCloudinary,
    deleteFromCloudinary,
    CloudinaryFolder,
    CloudinaryResourceType,
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

const deleteSchema = z.strictObject({
    publicId: z.string().trim().min(1).max(255),
    resourceType: z.enum(['image', 'raw', 'video']).optional(),
});

const hasValidSignature = (buffer: Buffer, mimetype: string): boolean => {
    switch (mimetype) {
        case 'image/jpeg':
            return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
        case 'image/png':
            return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        case 'image/webp':
            return buffer.length >= 12
                && buffer.toString('ascii', 0, 4) === 'RIFF'
                && buffer.toString('ascii', 8, 12) === 'WEBP';
        case 'application/pdf':
            return buffer.length >= 5 && buffer.toString('ascii', 0, 5) === '%PDF-';
        default:
            return false;
    }
};

const publicIdPattern = /^plataforma_educativa\/(avatars|courses\/covers|courses\/pdfs|courses\/lessons|achievements|tutorings|certificates)\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/[A-Za-z0-9_-]+$/i;

const canDeletePublicId = (
    publicId: string,
    userId: string,
    userRole: string | undefined,
    expectedFolder?: CloudinaryFolder,
): boolean => {
    const match = publicIdPattern.exec(publicId);
    if (!match) return false;

    const folder = match[1] as CloudinaryFolder;
    const ownerId = match[2];
    if (expectedFolder && folder !== expectedFolder) return false;

    if (folder !== 'avatars' && userRole !== 'admin' && userRole !== 'profesor') return false;
    return userRole === 'admin' || ownerId === userId;
};

export const uploadSingleFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const file = req.file;
        const userId = req.user?.id;
        const userRole = req.userRole;

        if (!userId) {
            res.status(401).json({ error: 'Tu sesión no es válida. Inicia sesión nuevamente.', code: 'UNAUTHENTICATED' });
            return;
        }
        if (!file) {
            res.status(400).json({ error: 'Selecciona un archivo para continuar.', code: 'FILE_REQUIRED' });
            return;
        }
        if (!hasValidSignature(file.buffer, file.mimetype)) {
            res.status(400).json({ error: 'El contenido del archivo no coincide con su formato.', code: 'INVALID_FILE' });
            return;
        }

        const requestedFolder = req.body.folder;
        if (typeof requestedFolder !== 'string' || !VALID_FOLDERS.includes(requestedFolder as CloudinaryFolder)) {
            res.status(400).json({ error: 'La categoría del archivo no es válida.', code: 'INVALID_FOLDER' });
            return;
        }

        const folder = requestedFolder as CloudinaryFolder;
        if (folder !== 'avatars' && userRole !== 'admin' && userRole !== 'profesor') {
            res.status(403).json({ error: 'No tienes permiso para subir archivos en esta sección.', code: 'FORBIDDEN' });
            return;
        }

        // Primero se sube el nuevo archivo. Si falla, el anterior permanece intacto.
        const uploaded = await uploadBufferToCloudinary(
            file.buffer,
            file.originalname,
            file.mimetype,
            folder,
            userId,
        );

        // Solo se elimina automáticamente un archivo nuevo y verificablemente propio.
        // Los publicId antiguos no contienen propietario: se conservan por seguridad.
        const previousPublicId = req.body.previousPublicId;
        if (typeof previousPublicId === 'string'
            && canDeletePublicId(previousPublicId, userId, userRole, folder)) {
            await deleteFromCloudinary(previousPublicId, file.mimetype === 'application/pdf' ? 'raw' : 'image');
        }

        res.status(201).json({
            message: 'Archivo subido correctamente.',
            file: uploaded,
        });
    } catch (error) {
        next(error);
    }
};

export const removeUploadedFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Tu sesión no es válida. Inicia sesión nuevamente.', code: 'UNAUTHENTICATED' });
            return;
        }

        const parsed = deleteSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: 'Los datos del archivo no son válidos.', code: 'INVALID_FILE_REFERENCE' });
            return;
        }

        const { publicId, resourceType = 'image' } = parsed.data;
        if (!canDeletePublicId(publicId, userId, req.userRole)) {
            // 404 evita confirmar la existencia de archivos ajenos.
            res.status(404).json({ error: 'No se encontró el archivo o no tienes permiso para eliminarlo.', code: 'FILE_NOT_FOUND' });
            return;
        }

        const deleted = await deleteFromCloudinary(publicId, resourceType as CloudinaryResourceType);
        if (!deleted) {
            res.status(502).json({ error: 'No se pudo eliminar el archivo. Intenta nuevamente.', code: 'FILE_DELETE_FAILED' });
            return;
        }

        res.status(200).json({ message: 'Archivo eliminado correctamente.' });
    } catch (error) {
        next(error);
    }
};
