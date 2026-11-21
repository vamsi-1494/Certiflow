import request from 'supertest';
import app from '../src/server';
import { describe, it, expect } from 'vitest';

describe('Phase 2: Authentication & Role-Based Access Control (RBAC)', () => {
  let anikaToken: string;
  let devToken: string;

  describe('Demo Persona Login', () => {
    it('Logs in as Anika (TRAINING_CENTRE) and receives a valid JWT', async () => {
      const res = await request(app)
        .post('/api/auth/demo-login')
        .send({ persona: 'anika' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe('anika@pragati.gov.in');
      expect(res.body.data.user.role).toBe('TRAINING_CENTRE');

      anikaToken = res.body.data.token;
    });

    it('Logs in as Dev (DISTRICT_OFFICER) and receives a valid JWT', async () => {
      const res = await request(app)
        .post('/api/auth/demo-login')
        .send({ persona: 'dev' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('dev@pragati.gov.in');
      expect(res.body.data.user.role).toBe('DISTRICT_OFFICER');

      devToken = res.body.data.token;
    });

    it('Logs in as Neha (QUALITY_TEAM)', async () => {
      const res = await request(app)
        .post('/api/auth/demo-login')
        .send({ persona: 'neha' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('QUALITY_TEAM');
    });

    it('Logs in as Farah (STATE_OFFICE)', async () => {
      const res = await request(app)
        .post('/api/auth/demo-login')
        .send({ persona: 'farah' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('STATE_OFFICE');
    });

    it('Rejects unknown persona with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/auth/demo-login')
        .send({ persona: 'unknown_hacker' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Unknown persona');
    });
  });

  describe('Protected Route Token Validation', () => {
    it('Blocks request to /api/auth/me without token (401)', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED');
    });

    it('Blocks request to /api/auth/me with invalid token (401)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.payload');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('TOKEN_INVALID');
    });
  });

  describe('Role-Based Access Control (RBAC) Enforcement', () => {
    it('Allows Anika to access Training Centre endpoint (200)', async () => {
      const res = await request(app)
        .get('/api/test/training-centre-only')
        .set('Authorization', `Bearer ${anikaToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('Prevents Anika from accessing District Officer endpoint (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/test/district-officer-only')
        .set('Authorization', `Bearer ${anikaToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
      expect(res.body.message).toContain('Access denied');
    });

    it('Allows Dev to access District Officer endpoint (200)', async () => {
      const res = await request(app)
        .get('/api/test/district-officer-only')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('Prevents Dev from accessing Training Centre endpoint (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/test/training-centre-only')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
      expect(res.body.message).toContain('Access denied');
    });
  });

  describe('User Logout', () => {
    it('Allows authenticated user to log out (200)', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${anikaToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Logged out successfully');
    });
  });
});
