import request from 'supertest';
import app from '../src/server';
import { describe, it, expect } from 'vitest';

describe('System Health & Foundation Probe', () => {
  it('GET /api/health returns 200 with service metadata', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.service).toBe('CertiFlow API');
    expect(res.body.mission).toBe('Pragati Skills Mission');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptimeSeconds');
  });
});
