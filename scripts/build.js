import fs from 'fs';
import path from 'path';
import { getRootDir } from '../api/config.js';
import { copyDirectoryRecursive } from '../api/services/storageService.js';
import { validateAll } from './validate.js';

export function buildStaticSite() {
  console.log('Initiating static build...');

  // Step 1: Pre-build validation
  validateAll();

  const rootDir = getRootDir();
  const distDir = path.join(rootDir, 'dist');

  // Step 2: Clean dist directory
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });

  // Step 3: Copy only public business sites /b/ to dist/b/
  const srcB = path.join(rootDir, 'b');
  const distB = path.join(distDir, 'b');

  if (fs.existsSync(srcB)) {
    copyDirectoryRecursive(srcB, distB);
  }

  // Step 4: Create a root index.html or 404 in dist if helpful
  const rootIndex = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>NFC Platform Hub</title>
  <style>
    body { font-family: -apple-system, sans-serif; text-align: center; padding: 50px 20px; background: #0f172a; color: #f8fafc; }
    h1 { font-size: 2rem; margin-bottom: 12px; }
    p { color: #94a3b8; }
  </style>
</head>
<body>
  <h1>NFC Platform Hub</h1>
  <p>Static micro-sites gateway.</p>
</body>
</html>
`;
  fs.writeFileSync(path.join(distDir, 'index.html'), rootIndex, 'utf-8');

  console.log(`Static build complete. Output written to: ${distDir}`);
  console.log('Security check: Admin UI, Node manager API, and credentials excluded from dist.');
}

if (process.argv[1] && process.argv[1].endsWith('build.js')) {
  buildStaticSite();
}
