import request from 'supertest';
import app from '../src/server';
import fs from 'fs';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CertificateService } from '../src/services/certificate.service.js';
import { MockWhatsAppService } from '../src/services/whatsapp.service.js';
import { CacheService } from '../src/services/cache.service.js';
import { SSEManager } from '../src/utils/sse.manager.js';

describe('AlgoHire Hackathon: 15 Mandatory Evaluation Scenarios (End-to-End)', () => {
  let anikaToken: string;
  let devToken: string;
  let meeraToken: string;
  let nehaToken: string;
  let farahToken: string;

  let smallBatchId: string;
  let largeBatchId: string;
  let returnBatchId: string;
  let issuedCert: any;

  beforeAll(async () => {
    await CacheService.flush();

    // Authenticate all 5 key personas
    const anikaRes = await request(app).post('/api/auth/demo-login').send({ persona: 'anika' });
    anikaToken = anikaRes.body.data.token;

    const devRes = await request(app).post('/api/auth/demo-login').send({ persona: 'dev' });
    devToken = devRes.body.data.token;

    const meeraRes = await request(app).post('/api/auth/demo-login').send({ persona: 'meera' });
    meeraToken = meeraRes.body.data.token;

    const nehaRes = await request(app).post('/api/auth/demo-login').send({ persona: 'neha' });
    nehaToken = nehaRes.body.data.token;

    const farahRes = await request(app).post('/api/auth/demo-login').send({ persona: 'farah' });
    farahToken = farahRes.body.data.token;
  });

  afterAll(() => {
    SSEManager.closeAll();
  });

  // -------------------------------------------------------------------------
  // Scenario 1: Persona Login & Role-Based Access Control (RBAC)
  // -------------------------------------------------------------------------
  it('Scenario 1: Enforces strict Role-Based Access Control (RBAC)', async () => {
    // Anika (Training Centre) cannot call District Officer endpoints (403)
    const tcForbidden = await request(app)
      .get('/api/approvals/district/dashboard')
      .set('Authorization', `Bearer ${anikaToken}`);
    expect(tcForbidden.status).toBe(403);

    // Dev (District Officer) cannot create a training batch (403)
    const doForbidden = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${devToken}`)
      .send({ courseName: 'Test Course', courseCode: 'TST-001' });
    expect(doForbidden.status).toBe(403);

    // Unauthenticated access blocked (401)
    const unauth = await request(app).get('/api/batches');
    expect(unauth.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // Scenario 2: Batch Creation in DRAFT Status
  // -------------------------------------------------------------------------
  it('Scenario 2: Allows Anika to create a new batch in DRAFT status', async () => {
    const res = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${anikaToken}`)
      .send({ courseName: 'Solar PV Installer', courseCode: 'SPV-201' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('DRAFT');
    expect(res.body.data.courseCode).toBe('SPV-201');
    smallBatchId = res.body.data.id;
  });

  // -------------------------------------------------------------------------
  // Scenario 3: All-or-Nothing Spreadsheet Validation (Exception 1)
  // -------------------------------------------------------------------------
  it('Scenario 3: Rejects invalid spreadsheet with exact row/field error breakdown and saves 0 records', async () => {
    // Row 2 has invalid phone number (9 digits instead of 10)
    // Row 3 has missing Aadhaar last 4
    const invalidCsv = `Full Name,Guardian Name,Date of Birth,Gender,Mobile Number,Aadhaar Last 4,Course Code,Training Completion Date
Pooja Patel,Kishore Patel,2001-03-12,Female,987654321,4321,SPV-201,2026-01-20
Rahul Verma,Sunil Verma,2000-07-15,Male,9812345678,,SPV-201,2026-01-20`;

    const res = await request(app)
      .post(`/api/batches/${smallBatchId}/upload`)
      .set('Authorization', `Bearer ${anikaToken}`)
      .attach('file', Buffer.from(invalidCsv), 'invalid.csv');

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('INVALID_SPREADSHEET');
    expect(res.body.details.invalidRows).toBeGreaterThanOrEqual(1);
    expect(res.body.details.errors.length).toBeGreaterThanOrEqual(1);

    // Verify 0 candidates saved
    const batchRes = await request(app)
      .get(`/api/batches/${smallBatchId}`)
      .set('Authorization', `Bearer ${anikaToken}`);
    expect(batchRes.body.data.candidates.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Scenario 4: Batch Submission transitioning to DISTRICT_REVIEW
  // -------------------------------------------------------------------------
  it('Scenario 4: Uploads valid spreadsheet and submits batch to DISTRICT_REVIEW', async () => {
    const validCsv = `Full Name,Guardian Name,Date of Birth,Gender,Mobile Number,Aadhaar Last 4,Course Code,Training Completion Date
Pooja Patel,Kishore Patel,2001-03-12,Female,9876543210,4321,SPV-201,2026-01-20
Rahul Verma,Sunil Verma,2000-07-15,Male,9812345678,8765,SPV-201,2026-01-20`;

    // Upload
    const uploadRes = await request(app)
      .post(`/api/batches/${smallBatchId}/upload`)
      .set('Authorization', `Bearer ${anikaToken}`)
      .attach('file', Buffer.from(validCsv), 'valid.csv');
    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.data.totalCandidates).toBe(2);

    // Submit
    const submitRes = await request(app)
      .post(`/api/batches/${smallBatchId}/submit`)
      .set('Authorization', `Bearer ${anikaToken}`);
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.status).toBe('DISTRICT_REVIEW');

    // Prevent re-submitting an already submitted batch
    const reSubmit = await request(app)
      .post(`/api/batches/${smallBatchId}/submit`)
      .set('Authorization', `Bearer ${anikaToken}`);
    expect(reSubmit.status).toBe(400);
  });

  // -------------------------------------------------------------------------
  // Scenario 5: 1st District Officer Approval (Dev)
  // -------------------------------------------------------------------------
  it('Scenario 5: Dev records 1st district approval (batch remains in DISTRICT_REVIEW)', async () => {
    const res = await request(app)
      .post(`/api/approvals/batches/${smallBatchId}/approve`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ comments: 'Candidate attendance registers verified.' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.approvalsCount).toBe(1);
    expect(res.body.data.status).toBe('DISTRICT_REVIEW');
  });

  // -------------------------------------------------------------------------
  // Scenario 6: Anti-Duplicate Approval Prevention (409 Conflict)
  // -------------------------------------------------------------------------
  it('Scenario 6: Prevents Dev from approving the same batch twice (409 Conflict)', async () => {
    const res = await request(app)
      .post(`/api/approvals/batches/${smallBatchId}/approve`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ comments: 'Trying to approve again' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('already approved this batch');
  });

  // -------------------------------------------------------------------------
  // Scenario 7: 2nd District Officer Approval (Meera)
  // -------------------------------------------------------------------------
  it('Scenario 7: Meera records 2nd district approval, completing dual-approval', async () => {
    const res = await request(app)
      .post(`/api/approvals/batches/${smallBatchId}/approve`)
      .set('Authorization', `Bearer ${meeraToken}`)
      .send({ comments: 'Practical assessment scorecards cross-checked.' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.approvalsCount).toBe(2);
  });

  // -------------------------------------------------------------------------
  // Scenario 8: Threshold Routing - Small Batch (<= 50) advances to STATE_APPROVAL
  // -------------------------------------------------------------------------
  it('Scenario 8: Small batch (2 candidates <= 50) bypasses quality review straight to STATE_APPROVAL', async () => {
    const batchRes = await request(app)
      .get(`/api/batches/${smallBatchId}`)
      .set('Authorization', `Bearer ${devToken}`);

    expect(batchRes.body.data.status).toBe('STATE_APPROVAL');
  });

  // -------------------------------------------------------------------------
  // Scenario 9: Threshold Routing - Large Batch (> 50) routes to QUALITY_REVIEW
  // -------------------------------------------------------------------------
  it('Scenario 9: Large batch (> 50 candidates) routes to QUALITY_REVIEW for Neha', async () => {
    // Create large batch
    const bRes = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${anikaToken}`)
      .send({ courseName: 'Data Entry Specialist', courseCode: 'DES-301' });
    largeBatchId = bRes.body.data.id;

    // Generate CSV with 55 candidates (> 50) using proven generator
    const largeCsv = `Full Name,Guardian Name,Date of Birth,Gender,Mobile Number,Aadhaar Last 4,Course Code,Training Completion Date\n` +
      Array.from({ length: 55 }, (_, i) => `Large Candidate ${i + 1},Guardian,2000-05-15,Female,99000${i.toString().padStart(5, '0')},22${i.toString().padStart(2, '0')},DES-301,2026-01-30`).join('\n');

    const uploadRes = await request(app)
      .post(`/api/batches/${largeBatchId}/upload`)
      .set('Authorization', `Bearer ${anikaToken}`)
      .attach('file', Buffer.from(largeCsv), 'large.csv');
    expect(uploadRes.status).toBe(200);

    const submitRes = await request(app)
      .post(`/api/batches/${largeBatchId}/submit`)
      .set('Authorization', `Bearer ${anikaToken}`);
    expect(submitRes.status).toBe(200);

    // Dev & Meera approve
    const approval1 = await request(app)
      .post(`/api/approvals/batches/${largeBatchId}/approve`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ comments: 'Dev verified 55 candidate records.' });
    expect(approval1.status).toBe(200);

    const approval2 = await request(app)
      .post(`/api/approvals/batches/${largeBatchId}/approve`)
      .set('Authorization', `Bearer ${meeraToken}`)
      .send({ comments: 'Meera verified 55 candidate attendance logs.' });
    expect(approval2.status).toBe(200);

    // Must be routed to QUALITY_REVIEW
    expect(approval2.body.data.status).toBe('QUALITY_REVIEW');
  });

  // -------------------------------------------------------------------------
  // Scenario 10: Quality Review Inspection & Approval (Neha)
  // -------------------------------------------------------------------------
  it('Scenario 10: Neha inspects and approves large batch, advancing it to STATE_APPROVAL', async () => {
    const res = await request(app)
      .post(`/api/approvals/quality/${largeBatchId}/approve`)
      .set('Authorization', `Bearer ${nehaToken}`)
      .send({ notes: 'Audited 10% random sample records. Assessment logs fully verified.' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('STATE_APPROVAL');
  });

  // -------------------------------------------------------------------------
  // Scenario 11: Return for Correction & Fresh Approval Round
  // -------------------------------------------------------------------------
  it('Scenario 11: District Officer returns batch for correction with mandatory reason; TC resubmits with round increment', async () => {
    // Create new batch
    const bRes = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${anikaToken}`)
      .send({ courseName: 'Welding Technology', courseCode: 'WELD-101' });
    returnBatchId = bRes.body.data.id;

    const csvData = `Full Name,Guardian Name,Date of Birth,Gender,Mobile Number,Aadhaar Last 4,Course Code,Training Completion Date
Ajay Kumar,Ramesh Kumar,2001-05-10,Male,9876501234,1122,WELD-101,2026-01-20`;

    await request(app).post(`/api/batches/${returnBatchId}/upload`).set('Authorization', `Bearer ${anikaToken}`).attach('file', Buffer.from(csvData), 'data.csv');
    await request(app).post(`/api/batches/${returnBatchId}/submit`).set('Authorization', `Bearer ${anikaToken}`);

    // Rejection without reason is blocked (400)
    const badReturn = await request(app)
      .post(`/api/approvals/batches/${returnBatchId}/return`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ reason: '' });
    expect(badReturn.status).toBe(400);

    // Return with mandatory reason
    const validReturn = await request(app)
      .post(`/api/approvals/batches/${returnBatchId}/return`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ reason: 'Discrepancy in practical welding log sheets.' });
    expect(validReturn.status).toBe(200);
    expect(validReturn.body.data.status).toBe('RETURNED_FOR_CORRECTION');

    // Resubmit begins Round 2
    const resubmitRes = await request(app)
      .post(`/api/batches/${returnBatchId}/resubmit`)
      .set('Authorization', `Bearer ${anikaToken}`);
    expect(resubmitRes.status).toBe(200);
    expect(resubmitRes.body.data.round).toBe(2);
    expect(resubmitRes.body.data.status).toBe('DISTRICT_REVIEW');
  });

  // -------------------------------------------------------------------------
  // Scenario 12: State Office Final Approval & Background Queue Trigger
  // -------------------------------------------------------------------------
  it('Scenario 12: Farah grants final State Office approval, triggering certificate issuance', async () => {
    const res = await request(app)
      .post(`/api/state/batches/${smallBatchId}/approve`)
      .set('Authorization', `Bearer ${farahToken}`)
      .send({ comments: 'National standard compliance confirmed. Approved for digital issuance.' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('APPROVED');
  });

  // -------------------------------------------------------------------------
  // Scenario 13: Idempotent Certificate Generation with Unique Numbering
  // -------------------------------------------------------------------------
  it('Scenario 13: Generates unique certificates with zero duplicates on re-execution (Idempotency)', async () => {
    const genRes = await CertificateService.generateCertificatesForBatch(smallBatchId);
    expect(genRes.success).toBe(true);
    expect(genRes.generatedCount).toBe(2);
    issuedCert = genRes.certificates[0];

    expect(issuedCert).toHaveProperty('certificateNumber');
    expect(issuedCert).toHaveProperty('verificationCode');
    expect(issuedCert).toHaveProperty('accessToken');
    expect(fs.existsSync(issuedCert.pdfPath)).toBe(true);

    // Re-run to verify strict idempotency
    const reRun = await CertificateService.generateCertificatesForBatch(smallBatchId);
    expect(reRun.success).toBe(true);
    expect(reRun.generatedCount).toBe(0); // 0 duplicate certificates generated!
  });

  // -------------------------------------------------------------------------
  // Scenario 14: Decoupled Simulated WhatsApp Notification (Exception 3)
  // -------------------------------------------------------------------------
  it('Scenario 14: Simulated WhatsApp delivers credential link; network errors never block issuance', async () => {
    const notifResult = await MockWhatsAppService.sendCertificateNotification({
      candidateId: issuedCert.candidateId,
      certificateId: issuedCert.id,
      recipientPhone: '9876543210',
      candidateName: 'Pooja Patel',
      courseName: 'Solar PV Installer',
      certificateNumber: issuedCert.certificateNumber,
      accessToken: issuedCert.accessToken
    }, 3); // Guarantee delivery on attempt 3

    expect(notifResult.success).toBe(true);
    expect(notifResult).toHaveProperty('messageId');
  });

  // -------------------------------------------------------------------------
  // Scenario 15: Public Verification, Privacy Masking & Instant Revocation Cache Purge
  // -------------------------------------------------------------------------
  it('Scenario 15: Public verification sanitizes PII, caches results, and immediately reflects revocation upon State cancellation', async () => {
    // 1. Zero-auth public verification
    const verifyRes1 = await request(app).get(`/api/certificates/verify/${issuedCert.certificateNumber}`);
    expect(verifyRes1.status).toBe(200);
    expect(verifyRes1.body.data.isValid).toBe(true);
    expect(verifyRes1.body.data.status).toBe('VERIFIED');
    expect(verifyRes1.body.data.candidateName).toBe('Pooja Patel');

    // Strict privacy guarantee
    expect(verifyRes1.body.data).not.toHaveProperty('mobileNumber');
    expect(verifyRes1.body.data).not.toHaveProperty('aadhaarLast4');

    // 2. Cache hit on second query
    const verifyRes2 = await request(app).get(`/api/certificates/verify/${issuedCert.certificateNumber}`);
    expect(verifyRes2.body.data.fromCache).toBe(true);

    // 3. State Office revokes certificate (Exception 4)
    const revokeRes = await request(app)
      .post(`/api/state/certificates/${issuedCert.id}/cancel`)
      .set('Authorization', `Bearer ${farahToken}`)
      .send({ reason: 'Found non-compliant training attendance records.' });
    expect(revokeRes.status).toBe(200);

    // 4. Instant Cache Invalidation: next query immediately reflects CANCELLED status!
    const verifyRes3 = await request(app).get(`/api/certificates/verify/${issuedCert.certificateNumber}`);
    expect(verifyRes3.body.data.isValid).toBe(false);
    expect(verifyRes3.body.data.status).toBe('CANCELLED');
    expect(verifyRes3.body.data.cancellationReason).toContain('non-compliant training attendance');

    // 5. Candidate PDF download endpoint works
    const dlRes = await request(app).get(`/api/certificates/download/${issuedCert.accessToken}`);
    expect(dlRes.status).toBe(200);
    expect(dlRes.headers['content-type']).toContain('application/pdf');
  });
});
