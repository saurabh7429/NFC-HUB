import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createApp } from '../../api/server.js';
import { getRootDir, getCanonicalUrl } from '../../api/config.js';
import { listThemes, getTheme } from '../../api/services/themeService.js';
import { decodeQrFromPngBuffer, decodeQrFromAnyImage } from '../../api/services/qrService.js';
import { compositeCardRaster, exportCard } from '../../api/services/cardService.js';

describe('Phase 3 Tests: Card Print Studio & QR Verification Engine', () => {
  let app;
  const rootDir = getRootDir();
  const testBizId = 'crd';

  beforeAll(async () => {
    app = createApp();

    // Clean up test folder if exists
    const bDir = path.join(rootDir, 'b', testBizId);
    if (fs.existsSync(bDir)) fs.rmSync(bDir, { recursive: true, force: true });

    // Create fresh business for testing
    await request(app)
      .post('/api/businesses')
      .send({
        id: testBizId,
        name: 'Apex Studio Cafe',
        tagline: 'Craft espresso & pastries',
        mode: 'link-hub',
        googleReviewUrl: 'https://g.page/r/apexcafe/review'
      });
  });

  afterAll(() => {
    const bDir = path.join(rootDir, 'b', testBizId);
    if (fs.existsSync(bDir)) fs.rmSync(bDir, { recursive: true, force: true });
  });

  it('1. Theme discovery: listThemes and getTheme return valid metadata', () => {
    const themes = listThemes(rootDir);
    expect(themes.length).toBeGreaterThanOrEqual(2);

    const theme01 = getTheme('01', rootDir);
    expect(theme01).toBeDefined();
    expect(theme01.id).toBe('01');
    expect(theme01.name).toContain('Minimal Dark');
    expect(theme01.trimMm.width).toBe(85.6);
    expect(theme01.trimMm.height).toBe(53.98);
    expect(theme01.qrSlotMm).toBeDefined();
    expect(fs.existsSync(theme01.basePath)).toBe(true);

    const missing = getTheme('non-existent', rootDir);
    expect(missing).toBeNull();
  });

  it('2. API: GET /api/themes returns all available card themes', async () => {
    const res = await request(app).get('/api/themes');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data[0].thumbUrl).toBeDefined();
  });

  it('3. QR Generation and Round-trip Decode from Composed Pixels', async () => {
    const expectedUrl = getCanonicalUrl(testBizId);
    expect(expectedUrl).toBe('https://saurabh7429.github.io/NFC-HUB/b/crd/');

    const composed = await compositeCardRaster(testBizId, {
      dpi: 300,
      includeBleed: true
    });

    expect(composed.pngBuffer).toBeInstanceOf(Buffer);
    // At 300 DPI, 91.6 mm x 59.98 mm = ~1082 x 708 px
    expect(composed.widthPx).toBe(1082);
    expect(composed.heightPx).toBe(708);

    // Decode QR directly from composed card pixels
    const decodeRes = decodeQrFromPngBuffer(composed.pngBuffer);
    expect(decodeRes.success).toBe(true);
    expect(decodeRes.data).toBe(expectedUrl);
  });

  it('4. API: GET /api/businesses/:id/card/verify-qr validates QR decodability', async () => {
    const res = await request(app).get(`/api/businesses/${testBizId}/card/verify-qr`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.matched).toBe(true);
    expect(res.body.decodedUrl).toBe('https://saurabh7429.github.io/NFC-HUB/b/crd/');
    expect(res.body.dimensions.widthPx).toBe(1082);
  });

  it('5. Exports: PDF, JPEG, and PNG produce valid print artwork', async () => {
    // Export PNG
    const pngExport = await exportCard(testBizId, 'png', { saveToBusiness: true });
    expect(pngExport.mimeType).toBe('image/png');
    expect(pngExport.qrDecodedUrl).toBe('https://saurabh7429.github.io/NFC-HUB/b/crd/');
    expect(pngExport.widthPx).toBe(1082);

    // Export JPG
    const jpgExport = await exportCard(testBizId, 'jpg', { saveToBusiness: true });
    expect(jpgExport.mimeType).toBe('image/jpeg');
    const decodeJpg = await decodeQrFromAnyImage(jpgExport.buffer);
    expect(decodeJpg.success).toBe(true);
    expect(decodeJpg.data).toBe('https://saurabh7429.github.io/NFC-HUB/b/crd/');

    // Export PDF
    const pdfExport = await exportCard(testBizId, 'pdf', { saveToBusiness: true });
    expect(pdfExport.mimeType).toBe('application/pdf');
    expect(pdfExport.buffer.slice(0, 4).toString()).toBe('%PDF');

    // Confirm saved to business /p/ folder
    const printDir = path.join(rootDir, 'b', testBizId, 'p');
    expect(fs.existsSync(path.join(printDir, `${testBizId}-card.png`))).toBe(true);
    expect(fs.existsSync(path.join(printDir, `${testBizId}-card.jpg`))).toBe(true);
    expect(fs.existsSync(path.join(printDir, `${testBizId}-card.pdf`))).toBe(true);
  });

  it('6. Publication Gate: Unverified business receives watermarked preview', async () => {
    // Business status is draft, verifiedAt is null
    const previewExport = await exportCard(testBizId, 'png', { strictNoWatermark: false });
    expect(previewExport.watermarked).toBe(true);

    // Strict export blocks if not verified
    await expect(exportCard(testBizId, 'png', { strictNoWatermark: true }))
      .rejects
      .toThrow('Export blocked: Destination URL is unverified');
  });

  it('7. Custom Reference Image workflow and QR repositioning', async () => {
    // Attach custom reference image
    const customRefPath = path.join(rootDir, 'b', testBizId, 'i', 'ref_card.png');
    // Copy base.png as dummy custom art
    fs.copyFileSync(path.join(rootDir, 't', '02', 'base.png'), customRefPath);

    const getRes = await request(app).get(`/api/businesses/${testBizId}`);
    const config = getRes.body.data;
    config.card.referenceImage = 'i/ref_card.png';
    config.card.themeId = null;
    config.card.qr = { xMm: 20, yMm: 15, sizeMm: 25 }; // Repositioned QR

    const putRes = await request(app).put(`/api/businesses/${testBizId}`).send(config);
    expect(putRes.status).toBe(200);

    // Verify preview and decoding work with custom image and custom coordinates
    const verifyRes = await request(app).get(`/api/businesses/${testBizId}/card/verify-qr`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.matched).toBe(true);
    expect(verifyRes.body.cardSettings.referenceImage).toBe('i/ref_card.png');
    expect(verifyRes.body.cardSettings.qr.xMm).toBe(20);
  });

  it('8. Business Isolation: Customizing testBizId does not alter other businesses or original theme files', () => {
    const originalTheme = JSON.parse(fs.readFileSync(path.join(rootDir, 't', '01', 'theme.json'), 'utf-8'));
    expect(originalTheme.qrSlotMm.x).toBe(56); // Theme file unmodified
    expect(originalTheme.id).toBe('01');
  });
});
