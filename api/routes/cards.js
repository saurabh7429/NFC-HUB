import express from 'express';
import { compositeCardRaster, exportCard } from '../services/cardService.js';
import { decodeQrFromPngBuffer } from '../services/qrService.js';
import { readBusinessConfig } from '../services/storageService.js';
import { getCanonicalUrl } from '../config.js';

export const cardsRouter = express.Router({ mergeParams: true });

// GET /api/businesses/:id/card/preview
cardsRouter.get('/preview', async (req, res) => {
  try {
    const { id } = req.params;
    const includeBleed = req.query.bleed === 'true';
    const preview = await compositeCardRaster(id, {
      forExport: false,
      includeBleed,
      dpi: 150 // Faster preview rendering
    });

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'no-cache');
    res.send(preview.pngBuffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/businesses/:id/card/verify-qr
cardsRouter.get('/verify-qr', async (req, res) => {
  try {
    const { id } = req.params;
    const config = readBusinessConfig(id);
    const expectedUrl = getCanonicalUrl(id);

    // Composite at full 300 DPI
    const composed = await compositeCardRaster(id, {
      forExport: false,
      includeBleed: true,
      dpi: 300
    });

    const decode = decodeQrFromPngBuffer(composed.pngBuffer);
    const matched = decode.success && decode.data === expectedUrl;

    res.json({
      success: decode.success,
      matched,
      expectedUrl,
      decodedUrl: decode.data,
      error: decode.error,
      cardSettings: config.card,
      dimensions: {
        widthPx: composed.widthPx,
        heightPx: composed.heightPx,
        widthMm: composed.totalWidthMm,
        heightMm: composed.totalHeightMm
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/businesses/:id/card/export/:format
cardsRouter.get('/export/:format', async (req, res) => {
  try {
    const { id, format } = req.params;
    const saveToBusiness = req.query.save === 'true';
    const isProductionRequest = req.query.production === 'true';

    const exported = await exportCard(id, format, {
      saveToBusiness,
      strictNoWatermark: isProductionRequest
    });

    res.set('Content-Type', exported.mimeType);
    res.set('Content-Disposition', `attachment; filename="${exported.filename}"`);
    res.set('X-QR-Decoded-Url', encodeURIComponent(exported.qrDecodedUrl));
    res.set('X-Card-Watermarked', exported.watermarked ? 'true' : 'false');
    res.send(exported.buffer);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});
