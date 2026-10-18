import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../../backend/src/app.js';

describe('Phase 1 API', () => {
  it('reports process health without claiming database readiness', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        status: 'ok',
        service: 'placement-api',
        phase: 'initialization',
        databases: 'not-configured',
      },
    });
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
  it('returns a consistent 404 for unimplemented routes', async () => {
    const response = await request(app).get('/api/students/me');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
  it('does not expose any write endpoint', async () => {
    const response = await request(app)
      .post('/api/health')
      .send({ role: 'admin' });
    expect(response.status).toBe(404);
  });
  it('allows the configured development origin with credentials', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });
  it('does not allow another browser origin', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'https://untrusted.example');
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
  it('handles malformed JSON without leaking details', async () => {
    const response = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"password":');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(JSON.stringify(response.body)).not.toContain('password');
  });
});
