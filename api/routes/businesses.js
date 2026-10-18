import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getRootDir, loadAppConfig, getCanonicalUrl } from '../config.js';
import {
  listAllBusinesses,
  readBusinessConfig,
  saveBusinessConfig,
  createBusinessFromStarter,
  duplicateBusiness,
  getBusinessDir
} from '../services/storageService.js';
import { allocateUniqueBusinessId, isIdAvailable } from '../services/idService.js';

export const businessesRouter = express.Router();

// Multer storage for uploads to b/<id>/i/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const businessId = req.params.id;
    const dest = path.join(getRootDir(), 'b', businessId, 'i');
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const prefix = req.query.type === 'reference' ? 'ref' : 'logo';
    const filename = `${prefix}_${Date.now()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('Only PNG, JPG/JPEG, and WebP images are allowed.'));
    }
    cb(null, true);
  }
});

// GET /api/businesses
businessesRouter.get('/', (req, res) => {
  try {
    const businesses = listAllBusinesses();
    res.json({ success: true, count: businesses.length, data: businesses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/businesses
businessesRouter.post('/', (req, res) => {
  try {
    let { id, name, tagline, mode, googleReviewUrl } = req.body;

    if (!id || id.trim() === '') {
      id = allocateUniqueBusinessId();
    } else {
      id = id.trim().toLowerCase();
      if (!isIdAvailable(id)) {
        return res.status(400).json({
          success: false,
          error: `Business ID "${id}" is invalid or already taken.`
        });
      }
    }

    const overrides = {
      name: name?.trim() || `Business ${id}`,
      tagline: tagline?.trim() || '',
      page: {
        mode: mode === 'direct-review' ? 'direct-review' : 'link-hub',
        title: name?.trim() || `Business ${id}`,
        description: `Connect with ${name?.trim() || id}`
      }
    };

    if (googleReviewUrl && googleReviewUrl.trim()) {
      overrides.links = [
        {
          id: 'google-review',
          type: 'google-review',
          label: 'Review us on Google',
          url: googleReviewUrl.trim(),
          enabled: true,
          order: 1
        }
      ];
    }

    const newBusiness = createBusinessFromStarter(id, overrides);
    res.status(201).json({
      success: true,
      message: `Business ${id} created successfully`,
      data: newBusiness
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/businesses/:id
businessesRouter.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const config = readBusinessConfig(id);
    const canonicalUrl = getCanonicalUrl(id);
    res.json({
      success: true,
      data: config,
      meta: { canonicalUrl }
    });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// PUT /api/businesses/:id
businessesRouter.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const saved = saveBusinessConfig(id, req.body);
    res.json({
      success: true,
      message: `Business ${id} updated successfully`,
      data: saved
    });
  } catch (err) {
    if (err.errors) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: err.errors
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/businesses/:id/duplicate
businessesRouter.post('/:id/duplicate', (req, res) => {
  try {
    const { id } = req.params;
    let targetId = req.body.targetId;
    if (!targetId || targetId.trim() === '') {
      targetId = allocateUniqueBusinessId();
    } else {
      targetId = targetId.trim().toLowerCase();
      if (!isIdAvailable(targetId)) {
        return res.status(400).json({
          success: false,
          error: `Target business ID "${targetId}" is unavailable.`
        });
      }
    }

    const duplicated = duplicateBusiness(id, targetId);
    res.status(201).json({
      success: true,
      message: `Business ${id} duplicated as ${targetId}`,
      data: duplicated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/businesses/:id/archive
businessesRouter.post('/:id/archive', (req, res) => {
  try {
    const { id } = req.params;
    const config = readBusinessConfig(id);
    config.status = 'archived';
    const updated = saveBusinessConfig(id, config);
    res.json({ success: true, message: `Business ${id} archived`, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/businesses/:id/restore
businessesRouter.post('/:id/restore', (req, res) => {
  try {
    const { id } = req.params;
    const config = readBusinessConfig(id);
    config.status = 'draft';
    const updated = saveBusinessConfig(id, config);
    res.json({ success: true, message: `Business ${id} restored to draft`, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/businesses/:id/upload
businessesRouter.post('/:id/upload', upload.single('asset'), (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const assetRelativePath = `i/${req.file.filename}`;
    const config = readBusinessConfig(id);

    if (req.query.type === 'reference') {
      config.card.referenceImage = assetRelativePath;
    } else {
      config.branding.logo = assetRelativePath;
    }

    saveBusinessConfig(id, config);

    res.json({
      success: true,
      message: 'Asset uploaded successfully',
      path: assetRelativePath,
      data: config
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
