import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

/**
 * Respuestas públicas estables: nunca se serializan errores de Supabase,
 * PostgreSQL, Cloudinary ni trazas internas al navegador.
 */
export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const requestId = randomUUID();
    res.setHeader('X-Request-Id', requestId);

    if (err instanceof multer.MulterError) {
        const message = err.code === 'LIMIT_FILE_SIZE'
            ? 'El archivo supera el tamaño máximo permitido.'
            : 'No fue posible procesar el archivo enviado.';
        return res.status(400).json({ error: message, code: 'UPLOAD_INVALID', requestId });
    }

    if (err instanceof Error && err.name === 'UploadValidationError') {
        return res.status(400).json({ error: 'Formato de archivo no válido. Usa JPG, PNG, WEBP o PDF.', code: 'UPLOAD_INVALID', requestId });
    }

    if (typeof err === 'object' && err !== null && 'type' in err && err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'El formato de la solicitud no es válido.', code: 'INVALID_JSON', requestId });
    }

    const error = err instanceof Error ? err : new Error('Unknown error');
    // El detalle queda solo en los logs del servidor; el requestId permite localizarlo.
    console.error(JSON.stringify({
        level: 'error',
        requestId,
        method: req.method,
        path: req.path,
        name: error.name,
        message: error.message,
    }));

    return res.status(500).json({
        error: 'Ocurrió un error inesperado. Intenta nuevamente.',
        code: 'INTERNAL_ERROR',
        requestId,
    });
};
