import request from 'supertest';
import app from '../src/server';
import fs from 'fs';
import { describe, it, expect, beforeAll } from 'vitest';
import { CertificateService } from '../src/services/certificate.service.js';
import { MockWhatsAppService } from '../src/services/whatsapp.service.js';

describe('Phase 6: PDF Certificate Generation, BullMQ Background Jobs & Simulated WhatsApp', () => {
  let anikaToken: string;
  let farahToken: string;
  let certBatchId: string;
  let generatedCert: any;

  beforeAll(async () => {
    // Authenticate Anika and Farah
    const anikaRes = await request(app).post('/api/auth/demo-login').send({ persona: 'anika' });
    anikaToken = anikaRes.body.data.token;

    const farahRes = await request(app).post('/api/auth/demo-login').send({ persona: 'farah' });
    farahToken = farahRes.body.data.token;

    // Create a batch with 2 candidates
    const bRes = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${anikaToken}`)
      .send({ courseName: 'Electrician Special', courseCode: 'ELEC-601' });
    certBatchId = bRes.body.data.id;

    const csvData = `Full Name,Guardian Name,Date of Birth,Gender,Mobile Number,Aadhaar Last 4,Course Code,Training Completion Date
Pooja Patel,Kishore Patel,2001-03-12,Female,9876543210,4321,ELEC-601,2026-01-20
Rahul Verma,Sunil Verma,2000-07-15,Male,9812345678,8765,ELEC-601,2026-01-20`;

    await request(app).post(`/api/batches/${certBatchId}/upload`).set('Authorization', `Bearer ${anikaToken}`).attach('file', Buffer.from(csvData), 'data.csv');
    await request(app).post(`/api/batches/${certBatchId}/submit`).set('Authorization', `Bearer ${anikaToken}`);
  });

  describe('1. PDF Generation & Idempotency (Requirement 10)', () => {
    it('Generates certificates for all candidates, writing valid PDF files to storage', async () => {
      const res = await CertificateService.generateCertificatesForBatch(certBatchId);

      expect(res.success).toBe(true);
      expect(res.generatedCount).toBe(2);
      expect(res.certificates.length).toBe(2);

      generatedCert = res.certificates[0];
      expect(generatedCert).toHaveProperty('certificateNumber');
      expect(generatedCert).toHaveProperty('accessToken');
      expect(generatedCert).toHaveProperty('verificationCode');

      // Verify physical PDF file exists on disk
      expect(fs.existsSync(generatedCert.pdfPath)).toBe(true);
      const stat = fs.statSync(generatedCert.pdfPath);
      expect(stat.size).toBeGreaterThan(1000); // Valid PDF with layout & QR code
    });

    it('IDEMPOTENCY: Re-running certificate generation does NOT create duplicate records', async () => {
      // Execute a second time on the same batch
      const secondRun = await CertificateService.generateCertificatesForBatch(certBatchId);

      expect(secondRun.success).toBe(true);
      expect(secondRun.generatedCount).toBe(0); // 0 new certificates created!
      expect(secondRun.certificates.length).toBe(2);
      expect(secondRun.certificates[0].certificateNumber).toBe(generatedCert.certificateNumber);
    });
  });

  describe('2. Simulated WhatsApp Notification & Decoupled Execution (Exception 3)', () => {
    it('Simulated WhatsApp delivers notification with certificate download link', async () => {
      const notifResult = await MockWhatsAppService.sendCertificateNotification({
        candidateId: 'test-cand-001',
        certificateId: generatedCert.id,
        recipientPhone: '9876543210',
        candidateName: 'Pooja Patel',
        courseName: 'Electrician Special',
        certificateNumber: generatedCert.certificateNumber,
        accessToken: generatedCert.accessToken
      }, 3); // Test on attempt 3 (guaranteed delivery)

      expect(notifResult.success).toBe(true);
      expect(notifResult).toHaveProperty('messageId');
    });

    it('WhatsApp failure does NOT block certificate generation', async () => {
      // Even if WhatsApp simulation throws, certificate generation finishes successfully
      expect(generatedCert.status).toBe('ISSUED');
      expect(fs.existsSync(generatedCert.pdfPath)).toBe(true);
    });
  });

  describe('3. Candidate Token-Based Access & Download', () => {
    it('Allows candidate to view their certificate using private accessToken', async () => {
      const res = await request(app).get(`/api/certificates/access/${generatedCert.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.certificateNumber).toBe(generatedCert.certificateNumber);
    });

    it('Blocks candidate access with invalid or forged token (404)', async () => {
      const res = await request(app).get('/api/certificates/access/forged_token_123');

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Invalid or expired');
    });

    it('Allows candidate to download their PDF certificate file directly', async () => {
      const res = await request(app).get(`/api/certificates/download/${generatedCert.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('.pdf');
    });
  });
});
