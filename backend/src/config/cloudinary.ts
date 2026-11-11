import { v2 as cloudinary, UploadApiResponse, UploadApiOptions } from 'cloudinary';
import { env } from './env';

cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
});

export type CloudinaryFolder =
    | 'avatars'
    | 'courses/covers'
    | 'courses/pdfs'
    | 'courses/lessons'
    | 'achievements'
    | 'tutorings'
    | 'certificates';

export type CloudinaryResourceType = 'image' | 'raw' | 'video';

export interface UploadResult {
    url: string;
    publicId: string;
    format: string;
    resourceType: string;
    bytes: number;
    originalFilename: string;
}

const cleanFileName = (originalName: string) => originalName
    .replace(/\\/g, '/')
    .split('/')
    .pop()!
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 50) || 'archivo';

/**
 * Los archivos nuevos quedan aislados por usuario:
 * plataforma_educativa/<folder>/<userId>/<filename>_<timestamp>
 * Esto permite comprobar la propiedad antes de borrar un recurso.
 */
export const uploadBufferToCloudinary = (
    buffer: Buffer,
    originalName: string,
    mimetype: string,
    folder: CloudinaryFolder,
    ownerId: string,
): Promise<UploadResult> => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ownerId)) {
        return Promise.reject(new Error('Identificador de propietario inválido'));
    }

    return new Promise((resolve, reject) => {
        const isPdf = mimetype === 'application/pdf';
        const options: UploadApiOptions = {
            folder: `plataforma_educativa/${folder}/${ownerId}`,
            public_id: `${cleanFileName(originalName)}_${Date.now()}`,
            resource_type: 'auto',
            overwrite: false,
            unique_filename: true,
            ...(isPdf
                ? { format: 'pdf' }
                : {
                    transformation: [
                        { width: 1600, crop: 'limit' },
                        { quality: 'auto', fetch_format: 'auto' },
                    ],
                }),
        };

        const stream = cloudinary.uploader.upload_stream(options, (error, result?: UploadApiResponse) => {
            if (error || !result) {
                reject(new Error('No se pudo almacenar el archivo'));
                return;
            }

            resolve({
                url: result.secure_url,
                publicId: result.public_id,
                format: result.format || (isPdf ? 'pdf' : 'img'),
                resourceType: result.resource_type,
                bytes: result.bytes,
                originalFilename: originalName,
            });
        });

        stream.end(buffer);
    });
};

/** No expone errores internos del proveedor al cliente. */
export const deleteFromCloudinary = async (
    publicId: string,
    resourceType: CloudinaryResourceType = 'image',
): Promise<boolean> => {
    if (!publicId) return false;

    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            invalidate: true,
            resource_type: resourceType,
        });
        return result.result === 'ok' || result.result === 'not found';
    } catch {
        console.error('Cloudinary: no se pudo eliminar un recurso.');
        return false;
    }
};

export default cloudinary;
