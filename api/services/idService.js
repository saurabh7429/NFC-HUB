import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getRootDir } from '../config.js';

const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function generateShortId(length = 3) {
  let result = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += CHARS[bytes[i] % CHARS.length];
  }
  return result;
}

export function isIdAvailable(id, rootDir = getRootDir()) {
  if (!id || typeof id !== 'string') return false;
  const cleanId = id.trim().toLowerCase();
  if (!/^[a-z0-9]{3,8}$/.test(cleanId)) return false;

  const businessDir = path.join(rootDir, 'b', cleanId);
  return !fs.existsSync(businessDir);
}

export function allocateUniqueBusinessId(length = 3, maxAttempts = 100, rootDir = getRootDir()) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateShortId(length);
    if (isIdAvailable(candidate, rootDir)) {
      return candidate;
    }
  }
  // Fall back to 4 chars if collisions occur
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateShortId(4);
    if (isIdAvailable(candidate, rootDir)) {
      return candidate;
    }
  }
  throw new Error('Failed to allocate unique business ID after multiple attempts');
}
