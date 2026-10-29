// backend/src/config/cloudinary.ts
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

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  resourceType: string;
  bytes: number;
  originalFilename: string;
}

export const uploadBufferToCloudinary = (
  buffer: Buffer,
  originalName: string,
  mimetype: string,
  folder: CloudinaryFolder
): Promise<UploadResult> => {
  return new Promise((resolve, reject) => {
    const isPdf = mimetype === 'application/pdf';
    const cleanName = originalName
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50);

    const options: UploadApiOptions = {
      folder: `plataforma_educativa/${folder}`,
      public_id: `${cleanName}_${Date.now()}`,
      // En Cloudinary, 'image' o 'auto' permite previsualizar páginas de PDF y optimizar fotos
      resource_type: 'auto',
      ...(isPdf
        ? { format: 'pdf' }
        : {
            transformation: [
              { width: 1600, crop: 'limit' }, // Evita imágenes gigantes innecesarias
              { quality: 'auto', fetch_format: 'auto' },
            ],
          }),
    };

    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result?: UploadApiResponse) => {
        if (error || !result) {
          return reject(error || new Error('Error al subir archivo a Cloudinary'));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format || (isPdf ? 'pdf' : 'img'),
          resourceType: result.resource_type,
          bytes: result.bytes,
          originalFilename: originalName,
        });
      }
    );

    stream.end(buffer);
  });
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
  } catch (err) {
    console.error('Error eliminando archivo en Cloudinary:', err);
  }
};

export default cloudinary;