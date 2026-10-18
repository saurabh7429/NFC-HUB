import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createApp } from '../../api/server.js';
import { getRootDir } from '../../api/config.js';

describe('Integration Tests: Local Admin API & Storage', () => {
  let app;
  const testBusinessId = 'tst';

  beforeAll(() => {
    app = createApp();
    // Clean up test folder if exists
    const testDir = path.join(getRootDir(), 'b', testBusinessId);
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    const testDir = path.join(getRootDir(), 'b', testBusinessId);
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    const dupDir = path.join(getRootDir(), 'b', 'dup');
    if (fs.existsSync(dupDir)) {
      fs.rmSync(dupDir, { recursive: true, force: true });
    }
  });

  it('GET /api/businesses returns empty or existing list', async () => {
    const res = await request(app).get('/api/businesses');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/businesses creates an independent business folder with its own files', async () => {
    const res = await request(app)
      .post('/api/businesses')
      .send({
        id: testBusinessId,
        name: 'Test Coffee Roasters',
        tagline: 'Best beans in town',
        mode: 'link-hub',
        googleReviewUrl: 'https://g.page/r/testcoffee/review'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(testBusinessId);

    // Verify independent folder contract
    const bDir = path.join(getRootDir(), 'b', testBusinessId);
    expect(fs.existsSync(path.join(bDir, 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(bDir, 'style.css'))).toBe(true);
    expect(fs.existsSync(path.join(bDir, 'script.js'))).toBe(true);
    expect(fs.existsSync(path.join(bDir, 'b.json'))).toBe(true);
    expect(fs.existsSync(path.join(bDir, 'i'))).toBe(true);
  });

  it('GET /api/businesses/:id retrieves correct configuration', async () => {
    const res = await request(app).get(`/api/businesses/${testBusinessId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test Coffee Roasters');
    expect(res.body.meta.canonicalUrl).toContain(`/b/${testBusinessId}/`);
  });

  it('PUT /api/businesses/:id atomically updates configuration', async () => {
    const getRes = await request(app).get(`/api/businesses/${testBusinessId}`);
    const updated = {
      ...getRes.body.data,
      name: 'Test Coffee Roasters (Updated)',
      branding: {
        ...getRes.body.data.branding,
        accentColor: '#10b981'
      }
    };

    const putRes = await request(app)
      .put(`/api/businesses/${testBusinessId}`)
      .send(updated);

    expect(putRes.status).toBe(200);
    expect(putRes.body.success).toBe(true);
    expect(putRes.body.data.name).toBe('Test Coffee Roasters (Updated)');
    expect(putRes.body.data.branding.accentColor).toBe('#10b981');
  });

  it('POST /api/businesses/:id/duplicate creates a distinct copy', async () => {
    const res = await request(app)
      .post(`/api/businesses/${testBusinessId}/duplicate`)
      .send({ targetId: 'dup' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('dup');

    const dupDir = path.join(getRootDir(), 'b', 'dup');
    expect(fs.existsSync(path.join(dupDir, 'b.json'))).toBe(true);
  });

  it('POST /api/businesses/:id/archive updates status to archived', async () => {
    const res = await request(app).post(`/api/businesses/${testBusinessId}/archive`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('archived');
  });

  it('POST /api/businesses/:id/restore restores status to draft', async () => {
    const res = await request(app).post(`/api/businesses/${testBusinessId}/restore`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('draft');
  });

  it('GET /api/config returns global application settings', async () => {
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rasterDpi).toBe(300);
  });
});
