import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { env } from '../../config/env';

const uploadPath = path.resolve(process.cwd(), env.uploadDir, 'captures');
const profileUploadPath = path.resolve(process.cwd(), env.uploadDir, 'vet-profiles');
fs.mkdirSync(uploadPath, { recursive: true });
fs.mkdirSync(profileUploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadPath),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${ext}`);
  },
});

// Local-disk storage for the dev/demo backend. Swap this multer storage
// engine for multer-s3 (or similar) to write directly to S3/Cloudinary in
// production — nothing else in the uploads route needs to change since the
// route only cares about `req.file`.
export const captureImageUpload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  },
});

export const vetProfileImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, profileUploadPath),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname) || '.jpg'}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Only image uploads are allowed')),
});
