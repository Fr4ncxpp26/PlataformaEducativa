// backend/src/modules/uploads/uploads.routes.ts
import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { uploadMiddleware } from '../../middlewares/upload';
import { uploadSingleFile, removeUploadedFile } from './uploads.controller';

const router = Router();

router.use(requireAuth);

// POST /api/uploads -> Sube imagen o PDF y retorna { file: { url, publicId, format, bytes, originalFilename } }
router.post('/', uploadMiddleware.single('file'), uploadSingleFile);

// DELETE /api/uploads -> Elimina un archivo en Cloudinary por su publicId
router.delete('/', removeUploadedFile);

export default router;