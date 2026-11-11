import multer from 'multer';
import { Request } from 'express';

// SVG se excluye para evitar contenido activo/JavaScript embebido.
// La firma binaria real también se valida en uploads.controller.ts.
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
];

export const uploadMiddleware = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1,
        fields: 3,
        fieldSize: 1024,
    },
    fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
            return;
        }

        const error = new Error('Formato de archivo no válido.');
        error.name = 'UploadValidationError';
        cb(error);
    },
});
