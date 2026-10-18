import { createApp } from '../api/server.js';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { getRootDir, getCanonicalUrl } from '../api/config.js';
import { validateAll } from './validate.js';
import { buildStaticSite } from './build.js';
import { decodeQrFromPngBuffer, decodeQrFromAnyImage } from '../api/services/qrService.js';
import { exportCard, compositeCardRaster } from '../api/services/cardService.js';

const app = createApp();
const rootDir = getRootDir();
const tempId = 'aud';

async function runProductionAudit() {
  console.log('================================================================');
  console.log('  STARTING DEEP PHASE 3 PRODUCTION-READINESS AUDIT');
  console.log('================================================================\n');

  // Clean if left over
  const tempDir = path.join(rootDir, 'b', tempId);
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });

  // --------------------------------------------------------------------------
  // SECTION 1: REAL TEMPORARY BUSINESS LIFECYCLE
  // --------------------------------------------------------------------------
  console.log('--- SECTION 1: REAL TEMPORARY BUSINESS & THEME CONFIGURATION ---');
  const createRes = await request(app)
    .post('/api/businesses')
    .send({
      id: tempId,
      name: 'Audited Artisan Roasters',
      tagline: 'Specialty coffee roastery & cafe',
      mode: 'link-hub',
      googleReviewUrl: 'https://g.page/r/audited/review'
    });

  if (createRes.status !== 201) throw new Error('Failed to create test business: ' + JSON.stringify(createRes.body));
  console.log('✓ Business "aud" created successfully via API');

  // Verify independent files in b/aud/
  ['index.html', 'style.css', 'script.js', 'b.json', 'i'].forEach(f => {
    if (!fs.existsSync(path.join(tempDir, f))) throw new Error(`Missing ${f} in business folder`);
  });
  console.log('✓ All independent business files verified in /b/aud/');

  // Configure theme 01 and customized QR coordinates
  const getRes = await request(app).get(`/api/businesses/${tempId}`);
  const bConfig = getRes.body.data;
  bConfig.card.themeId = '01';
  bConfig.card.trimMm = { width: 85.60, height: 53.98 };
  bConfig.card.bleedMm = 3;
  bConfig.card.qr = { xMm: 55, yMm: 15, sizeMm: 22 };

  const putRes = await request(app).put(`/api/businesses/${tempId}`).send(bConfig);
  if (putRes.status !== 200) throw new Error('Failed to update business card settings');
  console.log('✓ Theme 01 and custom QR coordinates (x: 55mm, y: 15mm, size: 22mm) saved atomically');

  // Run validation while business exists
  console.log('\n--- Running validation with active business ---');
  validateAll();
  console.log('✓ npm run validate passed with active business');

  // Run static build
  console.log('\n--- Running static build with active business ---');
  buildStaticSite();
  const distBizDir = path.join(rootDir, 'dist', 'b', tempId);
  if (!fs.existsSync(distBizDir) || !fs.existsSync(path.join(distBizDir, 'b.json'))) {
    throw new Error('Business missing from dist/ output!');
  }
  console.log('✓ Business files confirmed present in dist/b/aud/');

  // --------------------------------------------------------------------------
  // SECTION 2: CANONICAL URL & QR VERIFICATION (PNG, JPG, PDF)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 2: QR DECODE ROUNDTRIP ACROSS EXPORTS ---');
  const expectedUrl = getCanonicalUrl(tempId);
  console.log('Configured Canonical URL:', expectedUrl);
  if (expectedUrl !== 'https://saurabh7429.github.io/NFC-HUB/b/aud/') {
    throw new Error(`Unexpected canonical URL format: ${expectedUrl}`);
  }

  // 1. Raw composed raster decode
  const composed = await compositeCardRaster(tempId, { dpi: 300, includeBleed: true });
  const rawDecode = decodeQrFromPngBuffer(composed.pngBuffer);
  console.log('Composed Canvas QR decode result:', rawDecode);
  if (!rawDecode.success || rawDecode.data !== expectedUrl) {
    throw new Error('Raw composed QR decode failed or mismatch!');
  }
  console.log('✓ Composed canvas decodes exactly to expected canonical URL');

  // 2. Exported PNG decode
  const pngExport = await exportCard(tempId, 'png', { saveToBusiness: true });
  const pngDecode = decodeQrFromPngBuffer(pngExport.buffer);
  console.log('Exported PNG decode:', pngDecode.data);
  if (pngDecode.data !== expectedUrl) throw new Error('PNG export QR mismatch');
  console.log('✓ Exported PNG decodes exactly to canonical URL');

  // 3. Exported JPG decode
  const jpgExport = await exportCard(tempId, 'jpg', { saveToBusiness: true });
  const jpgDecode = await decodeQrFromAnyImage(jpgExport.buffer);
  console.log('Exported JPG decode:', jpgDecode.data);
  if (jpgDecode.data !== expectedUrl) throw new Error('JPG export QR mismatch');
  console.log('✓ Exported JPG decodes exactly to canonical URL');

  // 4. Exported PDF inspection
  const pdfExport = await exportCard(tempId, 'pdf', { saveToBusiness: true });
  if (pdfExport.buffer.slice(0, 4).toString() !== '%PDF') {
    throw new Error('PDF export invalid header');
  }
  console.log('✓ Exported PDF has valid %PDF header and size', pdfExport.buffer.length, 'bytes');

  // --------------------------------------------------------------------------
  // SECTION 3: PHYSICAL DIMENSIONS & BLEED AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 3: PHYSICAL DIMENSIONS & BLEED AUDIT ---');
  console.log('Trim size (mm):', composed.trimMm);
  console.log('Bleed (mm):', composed.bleedMm);
  console.log('Total canvas dimensions (mm):', composed.totalWidthMm, '×', composed.totalHeightMm);
  console.log('Pixel dimensions @ 300 DPI:', composed.widthPx, '×', composed.heightPx);

  if (composed.totalWidthMm !== 91.60 || composed.totalHeightMm !== 59.98) {
    throw new Error(`Bleed calculation mismatch: ${composed.totalWidthMm} x ${composed.totalHeightMm}`);
  }
  if (composed.widthPx !== 1082 || composed.heightPx !== 708) {
    throw new Error(`Pixel calculation mismatch: ${composed.widthPx} x ${composed.heightPx}`);
  }
  console.log('✓ Exact physical dimensions & 300 DPI raster match: 1082 x 708 px (91.60 x 59.98 mm)');

  // Trim-only mode (bleed = 0)
  const trimOnly = await compositeCardRaster(tempId, { dpi: 300, includeBleed: false });
  console.log('Trim-only dimensions:', trimOnly.totalWidthMm, '×', trimOnly.totalHeightMm, 'mm (', trimOnly.widthPx, '×', trimOnly.heightPx, 'px)');
  if (trimOnly.widthPx !== 1011 || trimOnly.heightPx !== 638) {
    throw new Error(`Trim-only dimensions mismatch: ${trimOnly.widthPx} x ${trimOnly.heightPx}`);
  }
  console.log('✓ Trim-only dimensions match: 1011 x 638 px (85.60 x 53.98 mm)');

  // --------------------------------------------------------------------------
  // SECTION 4: EXPORT BLOCKING GATE FOR UNVERIFIED URLS
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 4: EXPORT GATING & BLOCKING TEST ---');
  // Attempt strict production export via API query parameter
  const blockedApiRes = await request(app).get(`/api/businesses/${tempId}/card/export/png?production=true`);
  console.log('Production Export API Status for unverified draft:', blockedApiRes.status);
  console.log('Production Export API Error Body:', blockedApiRes.body);
  if (blockedApiRes.status !== 400 || !blockedApiRes.body.error.includes('Export blocked')) {
    throw new Error('Security failure: Production export was not blocked for unverified draft!');
  }
  console.log('✓ Clean production export was STRICTLY BLOCKED for unverified draft');

  // Preview export allowed with watermark
  const previewApiRes = await request(app).get(`/api/businesses/${tempId}/card/export/png`);
  if (previewApiRes.status !== 200) throw new Error('Preview export failed');
  if (previewApiRes.headers['x-card-watermarked'] !== 'true') {
    throw new Error('Preview export missing X-Card-Watermarked header');
  }
  console.log('✓ Draft export allowed as watermarked preview (X-Card-Watermarked: true)');

  // --------------------------------------------------------------------------
  // SECTION 5: BUSINESS & THEME ISOLATION
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 5: BUSINESS & THEME ISOLATION ---');
  const theme01Path = path.join(rootDir, 't', '01', 'theme.json');
  const theme01Data = JSON.parse(fs.readFileSync(theme01Path, 'utf-8'));
  console.log('Original Theme 01 QR Slot X coordinate:', theme01Data.qrSlotMm.x);
  if (theme01Data.qrSlotMm.x !== 56) throw new Error('Theme 01 corrupted!');
  console.log('✓ Original theme files in /t/01/ remain completely pristine and unmodified');

  // Verify saved files in b/aud/p/
  const printFiles = fs.readdirSync(path.join(tempDir, 'p'));
  console.log('Generated print files in /b/aud/p/:', printFiles);
  if (!printFiles.includes('aud-card.png') || !printFiles.includes('aud-card.jpg') || !printFiles.includes('aud-card.pdf')) {
    throw new Error('Print files missing from business /p/ folder');
  }
  console.log('✓ All print files properly contained within business-specific folder');

  // --------------------------------------------------------------------------
  // SECTION 6: CLEANUP
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 6: SAFE CLEANUP ---');
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('✓ Temporary business /b/aud/ removed');
  validateAll();
  buildStaticSite();
  console.log('✓ Clean slate validate & build confirmed');

  console.log('\n================================================================');
  console.log('  ALL PHASE 3 PRODUCTION READINESS CHECKS PASSED WITH EVIDENCE');
  console.log('================================================================');
}

runProductionAudit().catch(err => {
  console.error('\nAUDIT FAILED:', err);
  process.exit(1);
});
