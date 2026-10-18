import fs from 'fs';
import path from 'path';
import { getRootDir } from '../config.js';
import { validateThemeJson } from './validator.js';

export function listThemes(rootDir = getRootDir()) {
  const tDir = path.join(rootDir, 't');
  if (!fs.existsSync(tDir)) return [];

  const entries = fs.readdirSync(tDir, { withFileTypes: true });
  const themes = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const themeId = entry.name;
    const themeJsonPath = path.join(tDir, themeId, 'theme.json');
    if (!fs.existsSync(themeJsonPath)) continue;

    try {
      const data = JSON.parse(fs.readFileSync(themeJsonPath, 'utf-8'));
      const val = validateThemeJson(data);
      if (val.valid) {
        themes.push({
          ...data,
          thumbUrl: `/t/${themeId}/thumb.png`,
          baseUrl: `/t/${themeId}/base.png`
        });
      }
    } catch (e) {
      console.warn(`Error reading theme ${themeId}:`, e.message);
    }
  }

  return themes;
}

export function getTheme(themeId, rootDir = getRootDir()) {
  if (!themeId) return null;
  const themeJsonPath = path.join(rootDir, 't', themeId, 'theme.json');
  if (!fs.existsSync(themeJsonPath)) return null;

  const data = JSON.parse(fs.readFileSync(themeJsonPath, 'utf-8'));
  return {
    ...data,
    basePath: path.join(rootDir, 't', themeId, 'base.png'),
    thumbPath: path.join(rootDir, 't', themeId, 'thumb.png'),
    thumbUrl: `/t/${themeId}/thumb.png`,
    baseUrl: `/t/${themeId}/base.png`
  };
}
