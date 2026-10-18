import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import PDFDocument from 'pdfkit';
import { getRootDir, loadAppConfig, getCanonicalUrl } from '../config.js';
import { readBusinessConfig } from './storageService.js';
import { getTheme } from './themeService.js';
import { generateQrPngBuffer, decodeQrFromPngBuffer } from './qrService.js';

const MM_TO_INCH = 1 / 25.4;
const MM_TO_PT = 72 / 25.4; // 1 mm ~ 2.83465 pt (PDF standard)

export function mmToPixels(mm, dpi = 300) {
  return Math.round(mm * MM_TO_INCH * dpi);
}

/**
 * Composites the card artwork, QR code, and optional watermark at target 300 DPI.
 */
export async function compositeCardRaster(businessId, options = {}) {
  const rootDir = getRootDir();
  const config = loadAppConfig();
  const bData = readBusinessConfig(businessId, rootDir);
  const canonicalUrl = getCanonicalUrl(businessId, config);

  const dpi = options.dpi || config.rasterDpi || 300;
  const includeBleed = options.includeBleed !== undefined ? options.includeBleed : true;

  const trimMm = bData.card.trimMm || config.defaultCardTrimMm || { width: 85.60, height: 53.98 };
  const bleedMm = includeBleed ? (bData.card.bleedMm || 3) : 0;

  const totalWidthMm = trimMm.width + (bleedMm * 2);
  const totalHeightMm = trimMm.height + (bleedMm * 2);

  const canvasWidthPx = mmToPixels(totalWidthMm, dpi);
  const canvasHeightPx = mmToPixels(totalHeightMm, dpi);

  // 1. Determine background base image
  let baseImageBuffer = null;
  if (bData.card.referenceImage) {
    const customPath = path.join(rootDir, 'b', businessId, bData.card.referenceImage);
    if (fs.existsSync(customPath)) {
      baseImageBuffer = fs.readFileSync(customPath);
    }
  }

  if (!baseImageBuffer && bData.card.themeId) {
    const theme = getTheme(bData.card.themeId, rootDir);
    if (theme && fs.existsSync(theme.basePath)) {
      baseImageBuffer = fs.readFileSync(theme.basePath);
    }
  }

  // Fallback if no theme or image: generate solid background with border
  if (!baseImageBuffer) {
    const fallbackSvg = `<svg width="${canvasWidthPx}" height="${canvasHeightPx}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${canvasWidthPx}" height="${canvasHeightPx}" fill="#1e293b"/>
      <text x="50" y="100" font-family="sans-serif" font-size="32" fill="#ffffff">${bData.name}</text>
    </svg>`;
    baseImageBuffer = Buffer.from(fallbackSvg);
  }

  // Resize base image to canvas dimensions (including bleed)
  let canvasSharp = sharp(baseImageBuffer).resize(canvasWidthPx, canvasHeightPx, {
    fit: 'cover'
  });

  // 2. Generate QR code for canonical URL
  const qrSlot = bData.card.qr || { xMm: 56, yMm: 14, sizeMm: 24 };
  const qrSizePx = mmToPixels(qrSlot.sizeMm, dpi);
  const qrXOffsetPx = mmToPixels(qrSlot.xMm + bleedMm, dpi);
  const qrYOffsetPx = mmToPixels(qrSlot.yMm + bleedMm, dpi);

  const qrBuffer = await generateQrPngBuffer(canonicalUrl, {
    width: qrSizePx,
    margin: 2
  });

  const composites = [
    {
      input: qrBuffer,
      top: qrYOffsetPx,
      left: qrXOffsetPx
    }
  ];

  // 3. Watermark check: If not published and allowFinalExportBeforePublish is false
  const isVerifiedPublished = bData.status === 'published' && bData.publish?.verifiedAt;
  const requireWatermark = !isVerifiedPublished && !config.allowFinalExportBeforePublish;

  if (requireWatermark && options.forExport) {
    // Watermark banner along bottom edge so it clearly flags preview without occluding QR code modules
    const bannerH = 50;
    const watermarkSvg = `<svg width="${canvasWidthPx}" height="${canvasHeightPx}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow">
          <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#000000" flood-opacity="0.8"/>
        </filter>
      </defs>
      <rect x="0" y="${canvasHeightPx - bannerH}" width="${canvasWidthPx}" height="${bannerH}" fill="rgba(220, 38, 38, 0.92)"/>
      <text x="${canvasWidthPx / 2}" y="${canvasHeightPx - 16}" font-family="sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle" filter="url(#shadow)">PREVIEW • NOT FOR PRINT (DEPLOYMENT UNVERIFIED)</text>
    </svg>`;
    composites.push({
      input: Buffer.from(watermarkSvg),
      top: 0,
      left: 0
    });
  }

  const finalComposedPngBuffer = await canvasSharp.composite(composites).png().toBuffer();

  return {
    pngBuffer: finalComposedPngBuffer,
    widthPx: canvasWidthPx,
    heightPx: canvasHeightPx,
    totalWidthMm,
    totalHeightMm,
    trimMm,
    bleedMm,
    dpi,
    canonicalUrl,
    isVerifiedPublished,
    watermarked: requireWatermark && options.forExport
  };
}

/**
 * Exports card in PNG, JPEG, or PDF.
 */
export async function exportCard(businessId, format = 'png', options = {}) {
  const rootDir = getRootDir();
  const config = loadAppConfig();
  const bData = readBusinessConfig(businessId, rootDir);

  const isVerified = bData.status === 'published' && bData.publish?.verifiedAt;
  if (!isVerified && !config.allowFinalExportBeforePublish && options.strictNoWatermark) {
    throw new Error('Export blocked: Destination URL is unverified. Verified deployment is required for clean production card exports.');
  }

  // 1. Render composed raster
  const composed = await compositeCardRaster(businessId, {
    forExport: true,
    includeBleed: options.includeBleed !== undefined ? options.includeBleed : true,
    dpi: 300
  });

  // 2. Decode QR from final composed raster to guarantee readability
  const decodeResult = decodeQrFromPngBuffer(composed.pngBuffer);
  if (!decodeResult.success) {
    throw new Error(`Preflight check failed: Composed card QR code could not be decoded. Reason: ${decodeResult.error}`);
  }
  if (decodeResult.data !== composed.canonicalUrl) {
    throw new Error(`Preflight check failed: Decoded QR URL ("${decodeResult.data}") does not match canonical URL ("${composed.canonicalUrl}")`);
  }

  // 3. Format-specific output
  const fmt = format.toLowerCase();
  let outputBuffer = null;
  let mimeType = 'image/png';
  let filename = `${businessId}-card.${fmt}`;

  if (fmt === 'png') {
    outputBuffer = composed.pngBuffer;
    mimeType = 'image/png';
  } else if (fmt === 'jpg' || fmt === 'jpeg') {
    outputBuffer = await sharp(composed.pngBuffer).jpeg({ quality: 95 }).toBuffer();
    mimeType = 'image/jpeg';
    filename = `${businessId}-card.jpg`;
  } else if (fmt === 'pdf') {
    mimeType = 'application/pdf';
    filename = `${businessId}-card.pdf`;

    // PDF page size in points (72 points per inch)
    const pageWidthPt = composed.totalWidthMm * MM_TO_PT;
    const pageHeightPt = composed.totalHeightMm * MM_TO_PT;

    outputBuffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: [pageWidthPt, pageHeightPt],
        margin: 0,
        info: {
          Title: `${bData.name} NFC Card Artwork`,
          Author: 'NFC HUB Card Print Studio'
        }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Embed high-res raster card image filling page exactly
      doc.image(composed.pngBuffer, 0, 0, {
        width: pageWidthPt,
        height: pageHeightPt
      });

      doc.end();
    });
  } else {
    throw new Error(`Unsupported export format: ${format}`);
  }

  // Optional: save to business /p/ folder if requested
  if (options.saveToBusiness) {
    const printDir = path.join(rootDir, 'b', businessId, 'p');
    if (!fs.existsSync(printDir)) fs.mkdirSync(printDir, { recursive: true });
    fs.writeFileSync(path.join(printDir, filename), outputBuffer);
  }

  return {
    buffer: outputBuffer,
    mimeType,
    filename,
    qrDecodedUrl: decodeResult.data,
    canonicalUrl: composed.canonicalUrl,
    widthPx: composed.widthPx,
    heightPx: composed.heightPx,
    widthMm: composed.totalWidthMm,
    heightMm: composed.totalHeightMm,
    watermarked: composed.watermarked
  };
}
