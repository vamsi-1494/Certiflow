import request from 'supertest';
import app from '../src/server';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CacheService } from '../src/services/cache.service.js';
import { SSEManager } from '../src/utils/sse.manager.js';

describe('Phase 7: Public Certificate Verification, Redis Caching & Instant Invalidation', () => {
  let farahToken: string;

  beforeAll(async () => {
    // Flush cache to ensure pristine state
    await CacheService.flush();

    // Authenticate Farah (State Office) for revocation testing
    const farahRes = await request(app).post('/api/auth/demo-login').send({ persona: 'farah' });
    farahToken = farahRes.body.data.token;
  });

  afterAll(() => {
    SSEManager.closeAll();
  });

  describe('1. Zero-Authentication Public Verification & Privacy Protection', () => {
    it('Publicly verifies an authentic certificate without requiring login', async () => {
      const res = await request(app).get('/api/certificates/verify/PSM-2026-BPL-OFAP-0001');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isValid).toBe(true);
      expect(res.body.data.status).toBe('VERIFIED');
      expect(res.body.data.candidateName).toBe('Rohan Sharma');
      expect(res.body.data.courseName).toBe('Organic Farming & Agro-processing');
      expect(res.body.data.courseCode).toBe('OFAP-106');
      expect(res.body.data.trainingCentre).toBe('Apex Skill Development Centre');
      expect(res.body.data.district).toBe('Bhopal');
      expect(res.body.data.issuingAuthority).toContain('Pragati Skills Mission');

      // STRICT PRIVACY PROTECTION: Sensitive PII must NEVER be exposed publicly
      expect(res.body.data).not.toHaveProperty('mobileNumber');
      expect(res.body.data).not.toHaveProperty('aadhaarLast4');
      expect(res.body.data).not.toHaveProperty('guardianName');

      // Initial lookup was a cache miss, so fromCache is false
      expect(res.body.data.fromCache).toBe(false);
    });

    it('Caches verification queries: subsequent query is served directly from cache', async () => {
      const res = await request(app).get('/api/certificates/verify/PSM-2026-BPL-OFAP-0001');

      expect(res.status).toBe(200);
      expect(res.body.data.isValid).toBe(true);
      expect(res.body.data.status).toBe('VERIFIED');
      expect(res.body.data.candidateName).toBe('Rohan Sharma');
      // Must be served from cache!
      expect(res.body.data.fromCache).toBe(true);
    });

    it('Verifies certificate via Verification Hash/Code (QR code scan flow)', async () => {
      const res = await request(app).get('/api/certificates/verify/VRF-ROH-8899-VALID');

      expect(res.status).toBe(200);
      expect(res.body.data.isValid).toBe(true);
      expect(res.body.data.status).toBe('VERIFIED');
      expect(res.body.data.certificateNumber).toBe('PSM-2026-BPL-OFAP-0001');
    });

    it('Returns clear NOT_FOUND status for non-existent certificate number', async () => {
      const res = await request(app).get('/api/certificates/verify/PSM-9999-FAKE-0000');

      expect(res.status).toBe(200);
      expect(res.body.data.isValid).toBe(false);
      expect(res.body.data.status).toBe('NOT_FOUND');
      expect(res.body.data.message).toContain('No digital certificate');
    });
  });

  describe('2. Instant Cache Invalidation upon Revocation (Exception 4)', () => {
    it('Verifies a revoked certificate displays official cancellation alert', async () => {
      // cert-002 was pre-cancelled in seed data
      const res = await request(app).get('/api/certificates/verify/PSM-2026-BPL-TTT-0002-REVOKED');

      expect(res.status).toBe(200);
      expect(res.body.data.isValid).toBe(false);
      expect(res.body.data.status).toBe('CANCELLED');
      expect(res.body.data.candidateName).toBe('Vikram Aditya');
      expect(res.body.data).toHaveProperty('cancelledAt');
      expect(res.body.data).toHaveProperty('cancellationReason');
      expect(res.body.data.message).toContain('REVOKED / CANCELLED');
    });

    it('Purges cache immediately when State Office revokes a certificate', async () => {
      // 1. First ensure PSM-2026-BPL-OFAP-0001 is cached as VERIFIED
      const beforeRes = await request(app).get('/api/certificates/verify/PSM-2026-BPL-OFAP-0001');
      expect(beforeRes.body.data.status).toBe('VERIFIED');

      // 2. Farah revokes cert-001
      const revokeRes = await request(app)
        .post('/api/state/certificates/cert-001/cancel')
        .set('Authorization', `Bearer ${farahToken}`)
        .send({ reason: 'Irregularity identified during State vigilance audit.' });

      expect(revokeRes.status).toBe(200);
      expect(revokeRes.body.data.status).toBe('CANCELLED');

      // 3. Immediately query the public verification endpoint
      // Cache must have been purged, reflecting CANCELLED status instantly!
      const afterRes = await request(app).get('/api/certificates/verify/PSM-2026-BPL-OFAP-0001');

      expect(afterRes.status).toBe(200);
      expect(afterRes.body.data.isValid).toBe(false);
      expect(afterRes.body.data.status).toBe('CANCELLED');
      expect(afterRes.body.data.cancellationReason).toContain('State vigilance audit');
      expect(afterRes.body.data.message).toContain('REVOKED / CANCELLED');
    });
  });

  describe('3. Candidate Direct Secure Access & Token Protection', () => {
    it('Allows candidate to access their own certificate via private unique token', async () => {
      const res = await request(app).get('/api/certificates/access/tok_rohan_valid_access_key_9988');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.candidateName).toBe('Rohan Sharma');
      expect(res.body.data.certificateNumber).toBe('PSM-2026-BPL-OFAP-0001');
    });

    it('Rejects unauthorized access with forged or non-existent token (404)', async () => {
      const res = await request(app).get('/api/certificates/access/forged_candidate_token_xyz');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid or expired certificate access token');
    });
  });

  describe('4. Real-Time Server-Sent Events (SSE) Stream', () => {
    it('Provides status endpoint reporting connected SSE clients', async () => {
      const res = await request(app).get('/api/events/status');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('connectedClients');
    });

    it('Registers SSE client stream, sets text/event-stream headers, and broadcasts live events', () => {
      const written: string[] = [];
      const headers: Record<string, string> = {};

      const mockRes: any = {
        setHeader: (key: string, val: string) => {
          headers[key] = val;
        },
        flushHeaders: () => {},
        write: (chunk: string) => {
          written.push(chunk);
          return true;
        },
        on: (event: string, cb: Function) => {}
      };

      // 1. Add client to SSE manager
      SSEManager.addClient(mockRes);

      // Verify correct SSE headers
      expect(headers['Content-Type']).toBe('text/event-stream');
      expect(headers['Cache-Control']).toBe('no-cache');
      expect(headers['Connection']).toBe('keep-alive');

      // Verify initial handshake
      expect(written.some((msg) => msg.includes('CONNECTED'))).toBe(true);

      // 2. Broadcast a live test event
      SSEManager.broadcast('BATCH_STATUS_UPDATED', {
        batchId: 'batch-test-999',
        status: 'DISTRICT_REVIEW'
      });

      // Verify broadcast was delivered to connected stream
      const lastMsg = written[written.length - 1];
      expect(lastMsg).toContain('event: BATCH_STATUS_UPDATED');
      expect(lastMsg).toContain('batch-test-999');
    });
  });
});
