import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import sharp from 'sharp';

/**
 * Generates high-res QR code PNG buffer.
 * Error correction 'H' gives maximum reliability on physical cards.
 */
export async function generateQrPngBuffer(url, options = {}) {
  if (!url || typeof url !== 'string' || !url.startsWith('https://')) {
    throw new Error(`Invalid URL for QR generation: "${url}". Must be canonical HTTPS URL.`);
  }

  const margin = options.margin !== undefined ? options.margin : 2;
  const width = options.width || 600;

  const qrBuffer = await QRCode.toBuffer(url, {
    type: 'png',
    errorCorrectionLevel: 'H',
    margin,
    width,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });

  return qrBuffer;
}

/**
 * Decodes QR code from raw PNG buffer and returns decoded string.
 */
export function decodeQrFromPngBuffer(pngBuffer) {
  const png = PNG.sync.read(pngBuffer);
  const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  if (!code) {
    return { success: false, data: null, error: 'No QR code could be decoded from image buffer' };
  }
  return { success: true, data: code.data, error: null };
}

/**
 * Decodes QR code from any image buffer (JPEG, PNG, WebP) by converting to PNG first via sharp.
 */
export async function decodeQrFromAnyImage(imageBuffer) {
  const rawPng = await sharp(imageBuffer).png().toBuffer();
  return decodeQrFromPngBuffer(rawPng);
}
