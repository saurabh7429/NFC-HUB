import fs from 'fs';
import path from 'path';
import { getRootDir } from '../config.js';
import { validateBJson } from './validator.js';

export function getBusinessDir(id, rootDir = getRootDir()) {
  if (!id || !/^[a-z0-9]{3,8}$/.test(id)) {
    throw new Error(`Invalid business ID format: "${id}"`);
  }
  return path.join(rootDir, 'b', id);
}

export function writeJsonAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tmpPath = path.join(dir, `.tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

export function readBusinessConfig(id, rootDir = getRootDir()) {
  const bDir = getBusinessDir(id, rootDir);
  const bJsonPath = path.join(bDir, 'b.json');
  if (!fs.existsSync(bJsonPath)) {
    throw new Error(`Business ${id} configuration file not found at ${bJsonPath}`);
  }

  const raw = fs.readFileSync(bJsonPath, 'utf-8');
  const data = JSON.parse(raw);
  const validation = validateBJson(data);
  if (!validation.valid) {
    throw new Error(`Business ${id} has invalid b.json: ${JSON.stringify(validation.errors)}`);
  }
  return data;
}

export function saveBusinessConfig(id, data, rootDir = getRootDir()) {
  if (data.id !== id) {
    throw new Error(`Data ID "${data.id}" does not match target business ID "${id}"`);
  }

  const validation = validateBJson(data);
  if (!validation.valid) {
    const error = new Error(`Validation failed for business ${id}`);
    error.errors = validation.errors;
    throw error;
  }

  const bDir = getBusinessDir(id, rootDir);
  const bJsonPath = path.join(bDir, 'b.json');
  writeJsonAtomic(bJsonPath, data);
  return data;
}

export function copyDirectoryRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export function createBusinessFromStarter(newId, overrides = {}, rootDir = getRootDir()) {
  const bDir = getBusinessDir(newId, rootDir);
  if (fs.existsSync(bDir)) {
    throw new Error(`Business folder already exists for ID "${newId}"`);
  }

  const starterDir = path.join(rootDir, 's');
  if (!fs.existsSync(starterDir)) {
    throw new Error(`Starter directory not found at ${starterDir}`);
  }

  // Copy starter files to b/<newId>/
  copyDirectoryRecursive(starterDir, bDir);

  // Ensure assets subdirectories exist
  const imgDir = path.join(bDir, 'i');
  if (!fs.existsSync(imgDir)) {
    fs.mkdirSync(imgDir, { recursive: true });
  }
  const printDir = path.join(bDir, 'p');
  if (!fs.existsSync(printDir)) {
    fs.mkdirSync(printDir, { recursive: true });
  }

  // Read starter b.json
  const starterJsonPath = path.join(bDir, 'b.json');
  const starterConfig = JSON.parse(fs.readFileSync(starterJsonPath, 'utf-8'));

  // Merge defaults with overrides
  const newConfig = {
    ...starterConfig,
    id: newId,
    status: 'draft',
    name: overrides.name || starterConfig.name || `Business ${newId}`,
    tagline: overrides.tagline !== undefined ? overrides.tagline : starterConfig.tagline,
    branding: {
      ...starterConfig.branding,
      ...(overrides.branding || {})
    },
    page: {
      ...starterConfig.page,
      title: overrides.page?.title || overrides.name || starterConfig.page?.title || `Business ${newId}`,
      mode: overrides.page?.mode || starterConfig.page?.mode || 'link-hub',
      description: overrides.page?.description || starterConfig.page?.description || ''
    },
    links: overrides.links || starterConfig.links || [],
    card: {
      ...starterConfig.card,
      ...(overrides.card || {})
    },
    publish: {
      canonicalPath: `/b/${newId}/`,
      verifiedAt: null
    }
  };

  saveBusinessConfig(newId, newConfig, rootDir);
  return newConfig;
}

export function duplicateBusiness(sourceId, targetId, rootDir = getRootDir()) {
  const srcDir = getBusinessDir(sourceId, rootDir);
  const targetDir = getBusinessDir(targetId, rootDir);

  if (!fs.existsSync(srcDir)) {
    throw new Error(`Source business "${sourceId}" does not exist`);
  }
  if (fs.existsSync(targetDir)) {
    throw new Error(`Target business "${targetId}" already exists`);
  }

  copyDirectoryRecursive(srcDir, targetDir);

  // Load and adjust copied b.json
  const targetConfig = readBusinessConfig(targetId, rootDir);
  targetConfig.id = targetId;
  targetConfig.name = `${targetConfig.name} (Copy)`;
  targetConfig.status = 'draft';
  targetConfig.publish = {
    canonicalPath: `/b/${targetId}/`,
    verifiedAt: null
  };

  saveBusinessConfig(targetId, targetConfig, rootDir);
  return targetConfig;
}

export function listAllBusinesses(rootDir = getRootDir()) {
  const bRoot = path.join(rootDir, 'b');
  if (!fs.existsSync(bRoot)) {
    return [];
  }

  const entries = fs.readdirSync(bRoot, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const id = entry.name;
    if (!/^[a-z0-9]{3,8}$/.test(id)) continue;

    try {
      const config = readBusinessConfig(id, rootDir);
      results.push({
        id: config.id,
        name: config.name,
        tagline: config.tagline,
        status: config.status,
        mode: config.page.mode,
        logo: config.branding.logo,
        canonicalPath: config.publish.canonicalPath,
        verifiedAt: config.publish.verifiedAt,
        linksCount: config.links.length,
        enabledLinksCount: config.links.filter(l => l.enabled).length
      });
    } catch (err) {
      results.push({
        id,
        name: `Invalid (${id})`,
        status: 'error',
        error: err.message
      });
    }
  }

  return results;
}
