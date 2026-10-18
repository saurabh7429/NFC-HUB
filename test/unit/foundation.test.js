import { describe, it, expect } from 'vitest';
import { validateBJson, validateThemeJson, validateAppConfig } from '../../api/services/validator.js';
import { generateShortId, isIdAvailable } from '../../api/services/idService.js';
import { getCanonicalUrl } from '../../api/config.js';

describe('Unit Tests: Core Foundation', () => {
  it('validates a correct b.json schema', () => {
    const validData = {
      schemaVersion: 1,
      id: "a7k",
      status: "draft",
      name: "Prime Watch",
      tagline: "Thank you for visiting us",
      branding: {
        logo: "i/logo.webp",
        theme: "light",
        accentColor: "#17324D"
      },
      page: {
        mode: "link-hub",
        title: "Prime Watch",
        description: "Connect with Prime Watch"
      },
      links: [
        {
          id: "google",
          type: "google-review",
          label: "Review us on Google",
          url: "https://g.page/r/example/review",
          enabled: true,
          order: 1
        }
      ],
      card: {
        themeId: "01",
        referenceImage: null,
        trimMm: { width: 85.6, height: 53.98 },
        bleedMm: 3,
        qr: { xMm: 60, yMm: 17, sizeMm: 18 },
        exports: { pdf: true, jpg: true, png: true }
      },
      publish: {
        canonicalPath: "/b/a7k/",
        verifiedAt: null
      }
    };

    const res = validateBJson(validData);
    expect(res.valid).toBe(true);
    expect(res.errors.length).toBe(0);
  });

  it('rejects invalid b.json with missing fields or bad types', () => {
    const invalidData = {
      schemaVersion: 1,
      id: "INVALID_ID_WITH_CAPS",
      status: "unknown-status"
    };
    const res = validateBJson(invalidData);
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it('generates collision-resistant short IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      const id = generateShortId(3);
      expect(id).toMatch(/^[a-z0-9]{3}$/);
      ids.add(id);
    }
    expect(ids.size).toBeGreaterThan(90);
  });

  it('computes correct canonical public URL including project path and normalized slashes', () => {
    const config = {
      publicBaseUrl: "https://saurabh7429.github.io/NFC-HUB/",
      businessRoutePrefix: "/b/"
    };
    const url = getCanonicalUrl('a7k', config);
    expect(url).toBe('https://saurabh7429.github.io/NFC-HUB/b/a7k/');

    const cleanConfig = {
      publicBaseUrl: "https://saurabh7429.github.io/NFC-HUB",
      businessRoutePrefix: "/b"
    };
    expect(getCanonicalUrl('a7k', cleanConfig)).toBe('https://saurabh7429.github.io/NFC-HUB/b/a7k/');
  });

  it('validates card theme.json schema', () => {
    const validTheme = {
      schemaVersion: 1,
      id: "01",
      name: "Minimal Dark",
      trimMm: { width: 85.6, height: 53.98 },
      bleedMm: 3,
      safeAreaMm: 2,
      qrSlotMm: { x: 60, y: 17, width: 18, height: 18 },
      supports: ["pdf", "jpg", "png"]
    };
    const res = validateThemeJson(validTheme);
    expect(res.valid).toBe(true);
  });
});
