import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateAppConfig } from './services/validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT_DIR, 'config', 'app-config.json');

let cachedConfig = null;

export function getRootDir() {
  return ROOT_DIR;
}

export function loadAppConfig(forceReload = false) {
  if (cachedConfig && !forceReload) {
    return cachedConfig;
  }

  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Configuration file not found at ${CONFIG_PATH}`);
  }

  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in configuration file: ${err.message}`);
  }

  const validation = validateAppConfig(parsed);
  if (!validation.valid) {
    throw new Error(`Config validation failed: ${JSON.stringify(validation.errors)}`);
  }

  cachedConfig = parsed;
  return cachedConfig;
}

export function saveAppConfig(newConfig) {
  const validation = validateAppConfig(newConfig);
  if (!validation.valid) {
    throw new Error(`Cannot save invalid config: ${JSON.stringify(validation.errors)}`);
  }

  const tmpPath = `${CONFIG_PATH}.tmp.${Date.now()}`;
  fs.writeFileSync(tmpPath, JSON.stringify(newConfig, null, 2), 'utf-8');
  fs.renameSync(tmpPath, CONFIG_PATH);
  cachedConfig = newConfig;
  return cachedConfig;
}

export function getCanonicalUrl(businessId, config = loadAppConfig()) {
  const baseUrl = (config.publicBaseUrl || '').trim().replace(/\/+$/, '');
  const prefix = (config.businessRoutePrefix || '').trim().replace(/^\/+|\/+$/g, '');
  const cleanId = (businessId || '').trim().replace(/^\/+|\/+$/g, '');
  const pathPart = prefix ? `/${prefix}/${cleanId}/` : `/${cleanId}/`;
  return `${baseUrl}${pathPart}`;
}
