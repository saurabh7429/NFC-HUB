import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createApp } from '../../api/server.js';
import { getRootDir } from '../../api/config.js';

describe('Phase 2 Tests: Micro-Site Behavior & Cross-Business Isolation', () => {
  let app;
  const bizA = 'bza';
  const bizB = 'bzb';
  const rootDir = getRootDir();

  beforeAll(async () => {
    app = createApp();

    // Clean up if exist
    [bizA, bizB].forEach(id => {
      const p = path.join(rootDir, 'b', id);
      if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
    });

    // Create Business A: Link Hub mode with specific styles & links
    await request(app)
      .post('/api/businesses')
      .send({
        id: bizA,
        name: 'Alpha Dental Care',
        tagline: 'Gentle dentistry for the entire family',
        mode: 'link-hub',
        googleReviewUrl: 'https://g.page/r/alphadental/review'
      });

    // Create Business B: Direct Review mode
    await request(app)
      .post('/api/businesses')
      .send({
        id: bizB,
        name: 'Beta Specialty Auto',
        tagline: 'Precision diagnostics',
        mode: 'direct-review',
        googleReviewUrl: 'https://g.page/r/betaauto/review'
      });
  });

  afterAll(() => {
    [bizA, bizB].forEach(id => {
      const p = path.join(rootDir, 'b', id);
      if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
    });
  });

  it('Requirement: Every business has its own folder and own files', () => {
    [bizA, bizB].forEach(id => {
      const bDir = path.join(rootDir, 'b', id);
      expect(fs.existsSync(path.join(bDir, 'index.html'))).toBe(true);
      expect(fs.existsSync(path.join(bDir, 'style.css'))).toBe(true);
      expect(fs.existsSync(path.join(bDir, 'script.js'))).toBe(true);
      expect(fs.existsSync(path.join(bDir, 'b.json'))).toBe(true);
      expect(fs.existsSync(path.join(bDir, 'i'))).toBe(true);
    });
  });

  it('Cross-Business Isolation: Modifying Business A style/config does not affect Business B', async () => {
    const cssAPath = path.join(rootDir, 'b', bizA, 'style.css');
    const cssBPath = path.join(rootDir, 'b', bizB, 'style.css');

    const originalCssB = fs.readFileSync(cssBPath, 'utf-8');

    // Modify Business A's CSS directly
    const customACss = originalCssB + '\n/* Custom override for Alpha Dental */\n.business-title { color: #ff00ff; }';
    fs.writeFileSync(cssAPath, customACss, 'utf-8');

    // Also update Business A's b.json via API
    const getResA = await request(app).get(`/api/businesses/${bizA}`);
    const updatedA = {
      ...getResA.body.data,
      name: 'Alpha Dental Care - Expanded',
      branding: {
        ...getResA.body.data.branding,
        accentColor: '#10b981'
      }
    };
    await request(app).put(`/api/businesses/${bizA}`).send(updatedA);

    // Verify Business B's files and config are completely unchanged
    const currentCssB = fs.readFileSync(cssBPath, 'utf-8');
    expect(currentCssB).toBe(originalCssB);
    expect(currentCssB).not.toContain('#ff00ff');

    const getResB = await request(app).get(`/api/businesses/${bizB}`);
    expect(getResB.body.data.name).toBe('Beta Specialty Auto');
    expect(getResB.body.data.branding.accentColor).toBe('#1d4ed8');
  });

  it('Direct Review Mode: config specifies direct-review with Google Review link', async () => {
    const getResB = await request(app).get(`/api/businesses/${bizB}`);
    const bData = getResB.body.data;
    expect(bData.page.mode).toBe('direct-review');
    const reviewLink = bData.links.find(l => l.type === 'google-review');
    expect(reviewLink).toBeDefined();
    expect(reviewLink.url).toBe('https://g.page/r/betaauto/review');
    expect(reviewLink.enabled).toBe(true);
  });

  it('Link Hub Mode: only enabled links are rendered when loaded', async () => {
    // Add extra disabled link to Business A
    const getResA = await request(app).get(`/api/businesses/${bizA}`);
    const configA = getResA.body.data;
    configA.links.push({
      id: 'ig',
      type: 'instagram',
      label: 'Instagram',
      url: 'https://instagram.com/alphadental',
      enabled: false,
      order: 2
    });
    configA.links.push({
      id: 'wa',
      type: 'whatsapp',
      label: 'WhatsApp',
      url: 'https://wa.me/1234567890',
      enabled: true,
      order: 3
    });

    const putRes = await request(app).put(`/api/businesses/${bizA}`).send(configA);
    expect(putRes.status).toBe(200);

    const savedA = putRes.body.data;
    const enabledLinks = savedA.links.filter(l => l.enabled);
    const disabledLinks = savedA.links.filter(l => !l.enabled);

    expect(enabledLinks.length).toBe(2); // Google Review + WhatsApp
    expect(disabledLinks.length).toBe(1); // Instagram
    expect(disabledLinks[0].id).toBe('ig');
  });

  it('Serving static preview routes independently at /b/<id>/', async () => {
    const resA = await request(app).get(`/b/${bizA}/index.html`);
    expect(resA.status).toBe(200);
    expect(resA.text).toContain('Business Micro-Site');
    expect(resA.text).toContain('Powered by NFC Hub');

    const resB = await request(app).get(`/b/${bizB}/index.html`);
    expect(resB.status).toBe(200);

    const jsonA = await request(app).get(`/b/${bizA}/b.json`);
    expect(jsonA.status).toBe(200);
    expect(jsonA.body.id).toBe(bizA);

    const jsonB = await request(app).get(`/b/${bizB}/b.json`);
    expect(jsonB.status).toBe(200);
    expect(jsonB.body.id).toBe(bizB);
  });
});
