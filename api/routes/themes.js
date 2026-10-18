import express from 'express';
import { listThemes, getTheme } from '../services/themeService.js';

export const themesRouter = express.Router();

themesRouter.get('/', (req, res) => {
  try {
    const themes = listThemes();
    res.json({ success: true, count: themes.length, data: themes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

themesRouter.get('/:id', (req, res) => {
  try {
    const theme = getTheme(req.params.id);
    if (!theme) {
      return res.status(404).json({ success: false, error: `Theme "${req.params.id}" not found` });
    }
    res.json({ success: true, data: theme });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
