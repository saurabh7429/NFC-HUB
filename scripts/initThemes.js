import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export async function createBuiltinThemes() {
  const root = path.resolve('.');
  const t01 = path.join(root, 't', '01');
  const t02 = path.join(root, 't', '02');
  fs.mkdirSync(t01, { recursive: true });
  fs.mkdirSync(t02, { recursive: true });

  // Theme 01: Minimal Dark Luxe (85.6 x 53.98 mm + 3mm bleed = 91.6 x 59.98 mm -> ~1082 x 708 px at 300 DPI)
  const svg01 = `<svg width="1082" height="708" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#1e293b"/>
      </linearGradient>
    </defs>
    <rect width="1082" height="708" fill="url(#g1)"/>
    <rect x="35" y="35" width="1012" height="638" rx="24" fill="none" stroke="#334155" stroke-width="4"/>
    <text x="80" y="160" font-family="sans-serif" font-size="42" font-weight="bold" fill="#f8fafc">TAP OR SCAN</text>
    <text x="80" y="220" font-family="sans-serif" font-size="26" fill="#94a3b8">Review us on Google &amp; Connect</text>
    <circle cx="110" cy="380" r="28" fill="#eab308"/>
    <text x="96" y="392" font-family="sans-serif" font-size="34" fill="#000000">★</text>
    <text x="160" y="392" font-family="sans-serif" font-size="28" font-weight="600" fill="#f8fafc">5.0 Star Experience</text>
  </svg>`;

  await sharp(Buffer.from(svg01)).png().toFile(path.join(t01, 'base.png'));
  await sharp(Buffer.from(svg01)).resize(300, 196).png().toFile(path.join(t01, 'thumb.png'));

  const meta01 = {
    schemaVersion: 1,
    id: "01",
    name: "Minimal Dark Luxe",
    trimMm: { width: 85.6, height: 53.98 },
    bleedMm: 3,
    safeAreaMm: 2,
    qrSlotMm: { x: 56, y: 14, width: 24, height: 24 },
    supports: ["pdf", "jpg", "png"]
  };
  fs.writeFileSync(path.join(t01, 'theme.json'), JSON.stringify(meta01, null, 2), 'utf-8');

  // Theme 02: Modern Clean Light
  const svg02 = `<svg width="1082" height="708" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="100%" stop-color="#f8fafc"/>
      </linearGradient>
    </defs>
    <rect width="1082" height="708" fill="url(#g2)"/>
    <rect x="35" y="35" width="1012" height="638" rx="24" fill="none" stroke="#e2e8f0" stroke-width="4"/>
    <text x="80" y="160" font-family="sans-serif" font-size="42" font-weight="bold" fill="#0f172a">LEAVE A REVIEW</text>
    <text x="80" y="220" font-family="sans-serif" font-size="26" fill="#64748b">Tap with phone or scan QR code</text>
    <rect x="80" y="350" width="300" height="64" rx="32" fill="#2563eb"/>
    <text x="120" y="392" font-family="sans-serif" font-size="24" font-weight="600" fill="#ffffff">★ Rate us 5 Stars</text>
  </svg>`;

  await sharp(Buffer.from(svg02)).png().toFile(path.join(t02, 'base.png'));
  await sharp(Buffer.from(svg02)).resize(300, 196).png().toFile(path.join(t02, 'thumb.png'));

  const meta02 = {
    schemaVersion: 1,
    id: "02",
    name: "Modern Clean Blue",
    trimMm: { width: 85.6, height: 53.98 },
    bleedMm: 3,
    safeAreaMm: 2,
    qrSlotMm: { x: 56, y: 14, width: 24, height: 24 },
    supports: ["pdf", "jpg", "png"]
  };
  fs.writeFileSync(path.join(t02, 'theme.json'), JSON.stringify(meta02, null, 2), 'utf-8');

  console.log('Themes 01 and 02 initialized successfully.');
}

if (process.argv[1] && process.argv[1].endsWith('initThemes.js')) {
  createBuiltinThemes().catch(console.error);
}
