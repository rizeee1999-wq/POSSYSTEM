import { Router } from 'express';
import multer from 'multer';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { requireAdmin } from '../middleware/auth.js';
import { isR2Configured, r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '../r2Client.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

async function uploadToR2(folder, file) {
  const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  return `${R2_PUBLIC_URL}/${key}`;
}

// POST /api/admin/uploads/product-image  (multipart/form-data, field name "image")
router.post('/admin/uploads/product-image', requireAdmin, upload.single('image'), async (req, res) => {
  if (!isR2Configured) {
    return res.status(503).json({ error: 'Image uploads are unavailable until Cloudflare R2 is configured' });
  }

  if (!req.file) return res.status(400).json({ error: 'No image file uploaded' });

  try {
    const url = await uploadToR2('products', req.file);
    res.status(201).json({ url });
  } catch (err) {
    return res.status(500).json({ error: `Upload to storage failed: ${err.message}` });
  }
});

// POST /api/admin/uploads/barber-avatar  (multipart/form-data, field name "image")
router.post('/admin/uploads/barber-avatar', requireAdmin, upload.single('image'), async (req, res) => {
  if (!isR2Configured) {
    return res.status(503).json({ error: 'Image uploads are unavailable until Cloudflare R2 is configured' });
  }

  if (!req.file) return res.status(400).json({ error: 'No image file uploaded' });

  try {
    const url = await uploadToR2('barbers', req.file);
    res.status(201).json({ url });
  } catch (err) {
    return res.status(500).json({ error: `Upload to storage failed: ${err.message}` });
  }
});

// Multer errors (e.g. file too large) land here instead of the generic handler.
router.use((err, req, res, next) => {
  if (err) return res.status(400).json({ error: err.message });
  next();
});

export default router;
