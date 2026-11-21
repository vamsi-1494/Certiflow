import request from 'supertest';
import app from '../src/server';
import { describe, it, expect, beforeAll } from 'vitest';

describe('Phase 4: District Dual-Approval, Concurrency & Quality Review', () => {
  let anikaToken: string;
  let devToken: string;
  let meeraToken: string;
  let kabirToken: string;
  let nehaToken: string;

  let smallBatchId: string;
  let largeBatchId: string;

  beforeAll(async () => {
    // Authenticate all personas
    const anikaRes = await request(app).post('/api/auth/demo-login').send({ persona: 'anika' });
    anikaToken = anikaRes.body.data.token;

    const devRes = await request(app).post('/api/auth/demo-login').send({ persona: 'dev' });
    devToken = devRes.body.data.token;

    const meeraRes = await request(app).post('/api/auth/demo-login').send({ persona: 'meera' });
    meeraToken = meeraRes.body.data.token;

    const kabirRes = await request(app).post('/api/auth/demo-login').send({ persona: 'kabir' });
    kabirToken = kabirRes.body.data.token;

    const nehaRes = await request(app).post('/api/auth/demo-login').send({ persona: 'neha' });
    nehaToken = nehaRes.body.data.token;

    // 1. Create and submit a Small Batch (10 candidates <= 50)
    const smallBatchRes = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${anikaToken}`)
      .send({ courseName: 'Solar Technician Small', courseCode: 'SPIT-SMALL' });
    smallBatchId = smallBatchRes.body.data.id;

    const smallCsv = `Full Name,Guardian Name,Date of Birth,Gender,Mobile Number,Aadhaar Last 4,Course Code,Training Completion Date\n` +
      Array.from({ length: 10 }, (_, i) => `Small Candidate ${i + 1},Guardian,2001-01-01,Male,98000000${i.toString().padStart(2, '0')},11${i.toString().padStart(2, '0')},SPIT-SMALL,2026-01-30`).join('\n');

    await request(app)
      .post(`/api/batches/${smallBatchId}/upload`)
      .set('Authorization', `Bearer ${anikaToken}`)
      .attach('file', Buffer.from(smallCsv), 'small.csv');

    await request(app)
      .post(`/api/batches/${smallBatchId}/submit`)
      .set('Authorization', `Bearer ${anikaToken}`);

    // 2. Create and submit a Large Batch (60 candidates > 50)
    const largeBatchRes = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${anikaToken}`)
      .send({ courseName: 'Solar Technician Large', courseCode: 'SPIT-LARGE' });
    largeBatchId = largeBatchRes.body.data.id;

    const largeCsv = `Full Name,Guardian Name,Date of Birth,Gender,Mobile Number,Aadhaar Last 4,Course Code,Training Completion Date\n` +
      Array.from({ length: 60 }, (_, i) => `Large Candidate ${i + 1},Guardian,2000-05-15,Female,99000${i.toString().padStart(5, '0')},22${i.toString().padStart(2, '0')},SPIT-LARGE,2026-01-30`).join('\n');

    await request(app)
      .post(`/api/batches/${largeBatchId}/upload`)
      .set('Authorization', `Bearer ${anikaToken}`)
      .attach('file', Buffer.from(largeCsv), 'large.csv');

    await request(app)
      .post(`/api/batches/${largeBatchId}/submit`)
      .set('Authorization', `Bearer ${anikaToken}`);
  });

  describe('1. Dual-Officer District Approval (Dev & Meera)', () => {
    it('Dev provides the 1st district approval (1/2 Approvals, remains in DISTRICT_REVIEW)', async () => {
      const res = await request(app)
        .post(`/api/approvals/batches/${smallBatchId}/approve`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({ comments: 'Dev verified infrastructure & biometric logs.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.approvalsCount).toBe(1);
      expect(res.body.data.status).toBe('DISTRICT_REVIEW');
    });

    it('Prevents Dev from approving the same batch a second time (409 Conflict)', async () => {
      const res = await request(app)
        .post(`/api/approvals/batches/${smallBatchId}/approve`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({ comments: 'Attempting duplicate approval.' });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already approved');
    });

    it('Meera provides the 2nd distinct district approval -> Small batch advances directly to STATE_APPROVAL', async () => {
      const res = await request(app)
        .post(`/api/approvals/batches/${smallBatchId}/approve`)
        .set('Authorization', `Bearer ${meeraToken}`)
        .send({ comments: 'Meera verified trainee attendance.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.approvalsCount).toBe(2);
      expect(res.body.data.status).toBe('STATE_APPROVAL'); // Small batch skips quality review!
    });
  });

  describe('2. Threshold-Triggered Quality Review (> 50 Candidates)', () => {
    it('Large batch (60 candidates) receives 2 district approvals and automatically routes to QUALITY_REVIEW', async () => {
      // 1st approval by Dev
      await request(app)
        .post(`/api/approvals/batches/${largeBatchId}/approve`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({ comments: 'Dev verified 60 candidate enrollments.' });

      // 2nd approval by Meera
      const res = await request(app)
        .post(`/api/approvals/batches/${largeBatchId}/approve`)
        .set('Authorization', `Bearer ${meeraToken}`)
        .send({ comments: 'Meera verified practical lab exams.' });

      expect(res.status).toBe(200);
      expect(res.body.data.approvalsCount).toBe(2);
      expect(res.body.data.status).toBe('QUALITY_REVIEW'); // Triggers Quality Review!
    });

    it('Prevents Training Centre or District Officer from approving Quality Review (403)', async () => {
      const res = await request(app)
        .post(`/api/approvals/quality/${largeBatchId}/approve`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({ notes: 'Illegal attempt by district officer' });

      expect(res.status).toBe(403);
    });

    it('Neha (Quality Team) approves quality audit, advancing batch to STATE_APPROVAL', async () => {
      const res = await request(app)
        .post(`/api/approvals/quality/${largeBatchId}/approve`)
        .set('Authorization', `Bearer ${nehaToken}`)
        .send({ notes: 'Quality inspection: 10% candidate sampling verified with video recordings.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('STATE_APPROVAL');
    });
  });

  describe('3. District Rejection & Return for Correction', () => {
    let testBatchId: string;

    beforeAll(async () => {
      const bRes = await request(app)
        .post('/api/batches')
        .set('Authorization', `Bearer ${anikaToken}`)
        .send({ courseName: 'Testing Rejection', courseCode: 'TEST-REJ' });
      testBatchId = bRes.body.data.id;

      const dummyCsv = `Full Name,Guardian Name,Date of Birth,Gender,Mobile Number,Aadhaar Last 4,Course Code,Training Completion Date\nCandidate One,Guardian,2001-01-01,Male,9800000001,1101,TEST-REJ,2026-01-30`;
      await request(app).post(`/api/batches/${testBatchId}/upload`).set('Authorization', `Bearer ${anikaToken}`).attach('file', Buffer.from(dummyCsv), 'dummy.csv');
      await request(app).post(`/api/batches/${testBatchId}/submit`).set('Authorization', `Bearer ${anikaToken}`);
    });

    it('Enforces mandatory reason when returning a batch for correction (400 if empty)', async () => {
      const res = await request(app)
        .post(`/api/approvals/batches/${testBatchId}/return`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({ reason: '' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('reason');
    });

    it('District Officer returns batch for correction with valid reason', async () => {
      const res = await request(app)
        .post(`/api/approvals/batches/${testBatchId}/return`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({ reason: 'Discrepancy found in candidate 1 attendance logs.' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('RETURNED_FOR_CORRECTION');
    });
  });
});
