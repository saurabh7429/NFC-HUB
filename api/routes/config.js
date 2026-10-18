import express from 'express';
import { loadAppConfig, saveAppConfig } from '../config.js';

export const configRouter = express.Router();

// GET /api/config
configRouter.get('/', (req, res) => {
  try {
    const config = loadAppConfig(true);
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/config
configRouter.put('/', (req, res) => {
  try {
    const updated = saveAppConfig(req.body);
    res.json({ success: true, message: 'Configuration saved successfully', data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});
