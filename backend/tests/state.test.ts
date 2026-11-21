import request from 'supertest';
import app from '../src/server';
import { describe, it, expect, beforeAll } from 'vitest';

describe('Phase 5: State Office Final Approval, Certificate Revocation & Audit Governance', () => {
  let anikaToken: string;
  let devToken: string;
  let meeraToken: string;
  let farahToken: string;

  let stateReadyBatchId: string;

  beforeAll(async () => {
    // Authenticate personas
    const anikaRes = await request(app).post('/api/auth/demo-login').send({ persona: 'anika' });
    anikaToken = anikaRes.body.data.token;

    const devRes = await request(app).post('/api/auth/demo-login').send({ persona: 'dev' });
    devToken = devRes.body.data.token;

    const meeraRes = await request(app).post('/api/auth/demo-login').send({ persona: 'meera' });
    meeraToken = meeraRes.body.data.token;

    const farahRes = await request(app).post('/api/auth/demo-login').send({ persona: 'farah' });
    farahToken = farahRes.body.data.token;

    // Create a batch and walk it to STATE_APPROVAL
    const bRes = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${anikaToken}`)
      .send({ courseName: 'State Final Workflow Test', courseCode: 'SFW-501' });
    stateReadyBatchId = bRes.body.data.id;

    const csvData = `Full Name,Guardian Name,Date of Birth,Gender,Mobile Number,Aadhaar Last 4,Course Code,Training Completion Date\nCandidate State,Guardian,2001-01-01,Male,9800000050,5050,SFW-501,2026-01-30`;
    await request(app).post(`/api/batches/${stateReadyBatchId}/upload`).set('Authorization', `Bearer ${anikaToken}`).attach('file', Buffer.from(csvData), 'data.csv');
    await request(app).post(`/api/batches/${stateReadyBatchId}/submit`).set('Authorization', `Bearer ${anikaToken}`);

    // Dev approval 1
    await request(app).post(`/api/approvals/batches/${stateReadyBatchId}/approve`).set('Authorization', `Bearer ${devToken}`);
    // Meera approval 2 (Advances to STATE_APPROVAL because candidate count <= 50)
    await request(app).post(`/api/approvals/batches/${stateReadyBatchId}/approve`).set('Authorization', `Bearer ${meeraToken}`);
  });

  describe('1. Final State Approval & Rejection', () => {
    it('Blocks District Officer (Dev) from calling State Office approval (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/state/batches/${stateReadyBatchId}/approve`)
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(403);
    });

    it('Allows Farah (State Office) to grant final approval -> status transitions to APPROVED', async () => {
      const res = await request(app)
        .post(`/api/state/batches/${stateReadyBatchId}/approve`)
        .set('Authorization', `Bearer ${farahToken}`)
        .send({ comments: 'Final executive verification complete.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APPROVED');
    });
  });

  describe('2. Certificate Revocation & Exception 4 Handling', () => {
    it('Blocks non-state users from attempting certificate cancellation (403)', async () => {
      const res = await request(app)
        .post('/api/state/certificates/cert-001/cancel')
        .set('Authorization', `Bearer ${anikaToken}`)
        .send({ reason: 'Unauthorized cancellation attempt' });

      expect(res.status).toBe(403);
    });

    it('Enforces mandatory explanation when cancelling a certificate (400)', async () => {
      const res = await request(app)
        .post('/api/state/certificates/cert-001/cancel')
        .set('Authorization', `Bearer ${farahToken}`)
        .send({ reason: '' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('mandatory');
    });

    it('Farah cancels an issued certificate: status becomes CANCELLED with audit preserved', async () => {
      const res = await request(app)
        .post('/api/state/certificates/cert-001/cancel')
        .set('Authorization', `Bearer ${farahToken}`)
        .send({ reason: 'Candidate biometric duplicate identified during State Vigilance audit.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CANCELLED');
      expect(res.body.data.cancellationReason).toContain('State Vigilance audit');
    });

    it('Prevents cancelling an already cancelled certificate (400)', async () => {
      const res = await request(app)
        .post('/api/state/certificates/cert-001/cancel')
        .set('Authorization', `Bearer ${farahToken}`)
        .send({ reason: 'Attempting duplicate cancellation' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already cancelled');
    });
  });

  describe('3. Audit Log Governance Explorer', () => {
    it('Allows Farah to retrieve immutable system audit records', async () => {
      const res = await request(app)
        .get('/api/state/audit-logs')
        .set('Authorization', `Bearer ${farahToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Verify that CERTIFICATE_CANCELLED and STATE_FINAL_APPROVED exist in the log
      const actions = res.body.data.map((l: any) => l.action);
      expect(actions).toContain('CERTIFICATE_CANCELLED');
      expect(actions).toContain('STATE_FINAL_APPROVED');
    });
  });
});
