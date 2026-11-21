import request from 'supertest';
import app from '../src/server';
import { describe, it, expect, beforeAll } from 'vitest';

describe('Phase 3: Training Centre Engine & Spreadsheet Validation', () => {
  let anikaToken: string;
  let devToken: string;
  let createdBatchId: string;

  beforeAll(async () => {
    // Authenticate Anika (Training Centre)
    const anikaRes = await request(app).post('/api/auth/demo-login').send({ persona: 'anika' });
    anikaToken = anikaRes.body.data.token;

    // Authenticate Dev (District Officer)
    const devRes = await request(app).post('/api/auth/demo-login').send({ persona: 'dev' });
    devToken = devRes.body.data.token;
  });

  const validCsv = `Full Name,Guardian Name,Date of Birth,Gender,Mobile Number,Aadhaar Last 4,Course Code,Training Completion Date
Pooja Sharma,Ramesh Sharma,2001-04-15,Female,9876543210,1234,SPIT-101,2026-01-30
Rahul Verma,Sunil Verma,2000-08-20,Male,9812345678,5678,SPIT-101,2026-01-30
Amina Khan,Tariq Khan,1999-12-10,Female,9712345678,9012,SPIT-101,2026-01-30`;

  const invalidCsv = `Full Name,Guardian Name,Date of Birth,Gender,Mobile Number,Aadhaar Last 4,Course Code,Training Completion Date
Valid Trainee,Guardian Name,2001-04-15,Female,9876543210,1234,SPIT-101,2026-01-30
Bad Phone Trainee,Guardian Name,2000-08-20,Male,12345,5678,SPIT-101,2026-01-30
Bad Aadhaar Trainee,Guardian Name,1999-12-10,Female,9712345678,99,SPIT-101,2026-01-30`;

  describe('1. Batch Creation & RBAC', () => {
    it('Allows Anika (Training Centre) to create a new batch in DRAFT status', async () => {
      const res = await request(app)
        .post('/api/batches')
        .set('Authorization', `Bearer ${anikaToken}`)
        .send({
          courseName: 'Solar Panel Installation Technician',
          courseCode: 'SPIT-101'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.totalCandidates).toBe(0);

      createdBatchId = res.body.data.id;
    });

    it('Prevents Dev (District Officer) from creating a batch (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/batches')
        .set('Authorization', `Bearer ${devToken}`)
        .send({
          courseName: 'Solar Panel Installation Technician',
          courseCode: 'SPIT-101'
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });
  });

  describe('2. All-or-Nothing Spreadsheet Validation (Exception 1)', () => {
    it('Dry-run spreadsheet validation reports exact row-level errors without saving', async () => {
      const res = await request(app)
        .post('/api/batches/validate-spreadsheet')
        .set('Authorization', `Bearer ${anikaToken}`)
        .attach('file', Buffer.from(invalidCsv), 'candidates_with_errors.csv');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isValid).toBe(false);
      expect(res.body.data.totalRows).toBe(3);
      expect(res.body.data.invalidRows).toBe(2);
      expect(res.body.data.validRows).toBe(1);

      // Verify exact row number and field error reporting
      const errors = res.body.data.errors;
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ rowNumber: 3, field: 'mobileNumber' }),
          expect.objectContaining({ rowNumber: 4, field: 'aadhaarLast4' })
        ])
      );
    });

    it('Rejects uploading invalid spreadsheet with 422 Unprocessable Entity and saves NO candidates', async () => {
      const res = await request(app)
        .post(`/api/batches/${createdBatchId}/upload`)
        .set('Authorization', `Bearer ${anikaToken}`)
        .attach('file', Buffer.from(invalidCsv), 'invalid.csv');

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('INVALID_SPREADSHEET');
      expect(res.body.details.invalidRows).toBe(2);

      // Verify batch candidate count remains 0 in database
      const batchRes = await request(app)
        .get(`/api/batches/${createdBatchId}`)
        .set('Authorization', `Bearer ${anikaToken}`);

      expect(batchRes.body.data.totalCandidates).toBe(0);
      expect(batchRes.body.data.candidates.length).toBe(0);
    });

    it('Uploads valid spreadsheet successfully and attaches all candidates', async () => {
      const res = await request(app)
        .post(`/api/batches/${createdBatchId}/upload`)
        .set('Authorization', `Bearer ${anikaToken}`)
        .attach('file', Buffer.from(validCsv), 'valid.csv');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalCandidates).toBe(3);

      // Verify candidates are persisted
      const batchRes = await request(app)
        .get(`/api/batches/${createdBatchId}`)
        .set('Authorization', `Bearer ${anikaToken}`);

      expect(batchRes.body.data.totalCandidates).toBe(3);
      expect(batchRes.body.data.candidates.length).toBe(3);
      expect(batchRes.body.data.candidates[0].fullName).toBe('Pooja Sharma');
    });
  });

  describe('3. Batch Submission & Workflow State Transition', () => {
    it('Submits batch with candidates, advancing status to DISTRICT_REVIEW', async () => {
      const res = await request(app)
        .post(`/api/batches/${createdBatchId}/submit`)
        .set('Authorization', `Bearer ${anikaToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DISTRICT_REVIEW');
    });

    it('Prevents re-submitting an already submitted batch (Invalid transition)', async () => {
      const res = await request(app)
        .post(`/api/batches/${createdBatchId}/submit`)
        .set('Authorization', `Bearer ${anikaToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Only batches in DRAFT status can be submitted');
    });
  });

  describe('4. Correction & Resubmission Cycle', () => {
    it('Allows correcting candidate details on a returned batch and resubmitting', async () => {
      // Fetch seeded sample batch 4 (which is in RETURNED_FOR_CORRECTION)
      const batch4Res = await request(app)
        .get('/api/batches/batch-004')
        .set('Authorization', `Bearer ${anikaToken}`);

      const candidateToFix = batch4Res.body.data.candidates[0];

      // Fix candidate Aadhaar
      const updateRes = await request(app)
        .put(`/api/batches/batch-004/candidates/${candidateToFix.id}`)
        .set('Authorization', `Bearer ${anikaToken}`)
        .send({ aadhaarLast4: '7788' });

      expect(updateRes.status).toBe(200);

      // Resubmit batch
      const resubmitRes = await request(app)
        .post('/api/batches/batch-004/resubmit')
        .set('Authorization', `Bearer ${anikaToken}`);

      expect(resubmitRes.status).toBe(200);
      expect(resubmitRes.body.data.status).toBe('DISTRICT_REVIEW');
      expect(resubmitRes.body.data.round).toBe(2); // Approval round incremented
    });
  });
});
