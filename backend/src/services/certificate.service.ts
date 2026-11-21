import path from 'path';
import crypto from 'crypto';
import { CertificateStatus, BatchStatus } from '@prisma/client';
import prisma, { isDbConnected } from '../utils/prisma.js';
import { CertificatePdfGenerator } from '../utils/pdf.generator.js';
import { MockWhatsAppService } from './whatsapp.service.js';
import { AuditService } from './audit.service.js';
import { BatchService } from './batch.service.js';
import { inMemoryCertificates } from '../utils/credential.store.js';
import { CacheService } from './cache.service.js';
import { SSEManager } from '../utils/sse.manager.js';

export { inMemoryCertificates };

const STORAGE_DIR = process.env.CERTIFICATE_STORAGE_DIR || path.join(process.cwd(), 'storage', 'certificates');
const FRONTEND_URL = process.env.PUBLIC_FRONTEND_URL || 'http://localhost:5173';

export class CertificateService {
  /**
   * Helper: Generates an idempotent, unique certificate number
   * Format: PSM-{YEAR}-{DISTRICT}-{COURSE}-{CANDIDATE_SUFFIX}-{RANDOM_HEX}
   */
  public static generateCertNumber(districtCode: string, courseCode: string, candidateIndex: number): string {
    const year = new Date().getFullYear();
    const cleanDist = (districtCode || 'GEN').toUpperCase().slice(0, 3);
    const cleanCourse = (courseCode || 'SKILL').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    const seq = (candidateIndex + 1).toString().padStart(4, '0');
    const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();

    return `PSM-${year}-${cleanDist}-${cleanCourse}-${seq}-${randomHex}`;
  }

  /**
   * Generates certificates for all candidates in an approved batch.
   * Strictly idempotent: Never generates duplicates if re-executed.
   */
  static async generateCertificatesForBatch(batchId: string): Promise<{ success: boolean; generatedCount: number; certificates: any[] }> {
    const batch = await BatchService.getBatchById(batchId, { role: 'STATE_OFFICE', userId: 'system', email: 'system@pragati.gov.in', name: 'System Worker' });

    if (!batch.candidates || batch.candidates.length === 0) {
      const err: any = new Error(`Batch '${batchId}' has no candidates to generate certificates for.`);
      err.statusCode = 400;
      throw err;
    }

    const generatedCertificates: any[] = [];
    let newlyCreated = 0;

    for (let i = 0; i < batch.candidates.length; i++) {
      const candidate = batch.candidates[i];

      // 1. Idempotency Check: Does this candidate already possess a certificate?
      let existingCert: any = null;
      if (isDbConnected()) {
        try {
          existingCert = await prisma.certificate.findFirst({
            where: { batchId, candidateId: candidate.id }
          });
        } catch (e) {}
      }

      if (!existingCert) {
        for (const c of inMemoryCertificates.values()) {
          if (c.candidateId === candidate.id && c.batchId === batchId) {
            existingCert = c;
            break;
          }
        }
      }

      if (existingCert) {
        console.log(`[CertEngine] Idempotency: Candidate '${candidate.fullName}' already has certificate '${existingCert.certificateNumber}'. Skipping duplicate generation.`);
        generatedCertificates.push(existingCert);
        continue;
      }

      // 2. Generate Unique Credential Identifiers
      const certNumber = this.generateCertNumber(batch.district?.code || batch.districtName || 'BPL', batch.courseCode, i);
      const verificationCode = `VRF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const accessToken = `tok_${candidate.id.slice(-6)}_${crypto.randomBytes(8).toString('hex')}`;
      const verificationUrl = `${FRONTEND_URL}/verify?code=${verificationCode}`;

      // 3. Render High-Resolution PDF
      const pdfPath = await CertificatePdfGenerator.generatePdf(
        {
          certificateNumber: certNumber,
          candidateName: candidate.fullName,
          guardianName: candidate.guardianName,
          courseName: batch.courseName,
          courseCode: batch.courseCode,
          trainingCentreName: batch.trainingCentre?.name || batch.trainingCentreName || 'Affiliated Centre',
          districtName: batch.district?.name || batch.districtName || 'Bhopal',
          issueDate: new Date(),
          verificationCode,
          verificationUrl,
          issuingAuthority: 'Pragati Skills Mission, Govt of India'
        },
        STORAGE_DIR
      );

      // 4. Save to Database
      const certData = {
        id: `cert-${Date.now()}-${i}`,
        certificateNumber: certNumber,
        candidateId: candidate.id,
        candidateName: candidate.fullName,
        courseName: batch.courseName,
        courseCode: batch.courseCode,
        trainingCentreName: batch.trainingCentre?.name || batch.trainingCentreName,
        districtName: batch.district?.name || batch.districtName,
        batchId,
        batchNumber: batch.batchNumber,
        verificationCode,
        accessToken,
        pdfPath,
        status: CertificateStatus.ISSUED,
        issueDate: new Date(),
        issuingAuthority: 'Pragati Skills Mission, Govt of India',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (isDbConnected()) {
        try {
          const dbCert = await prisma.certificate.create({
            data: {
              certificateNumber: certNumber,
              candidateId: candidate.id,
              batchId,
              verificationCode,
              accessToken,
              pdfPath,
              status: CertificateStatus.ISSUED
            }
          });
          certData.id = dbCert.id;
        } catch (e) {
          inMemoryCertificates.set(certData.id, certData);
        }
      } else {
        inMemoryCertificates.set(certData.id, certData);
      }

      generatedCertificates.push(certData);
      newlyCreated++;

      // 5. Trigger Simulated WhatsApp Notification (Decoupled & Non-blocking)
      MockWhatsAppService.sendCertificateNotification({
        candidateId: candidate.id,
        certificateId: certData.id,
        recipientPhone: candidate.mobileNumber,
        candidateName: candidate.fullName,
        courseName: batch.courseName,
        certificateNumber: certNumber,
        accessToken
      }).catch((notifErr) => {
        // Exception 3: WhatsApp network failure does NOT block certificate generation!
        console.warn(`[CertEngine] WhatsApp delivery notice failed for ${candidate.mobileNumber}:`, notifErr.message);
      });
    }

    // 6. Update Batch Status to ISSUED
    if (isDbConnected()) {
      try {
        await prisma.batch.update({
          where: { id: batchId },
          data: { status: BatchStatus.ISSUED }
        });
      } catch (e) {
        batch.status = BatchStatus.ISSUED;
      }
    } else {
      batch.status = BatchStatus.ISSUED;
    }

    await AuditService.record({
      action: 'BATCH_CERTIFICATES_ISSUED',
      batchId,
      previousState: BatchStatus.APPROVED,
      newState: BatchStatus.ISSUED,
      reason: `Generated ${newlyCreated} certificates. Total batch certificates: ${generatedCertificates.length}.`
    });

    // Real-Time Notification via Server-Sent Events (SSE)
    SSEManager.broadcast('CERTIFICATES_ISSUED', {
      batchId,
      batchNumber: batch.batchNumber,
      newlyCreated,
      totalCount: generatedCertificates.length
    });

    return {
      success: true,
      generatedCount: newlyCreated,
      certificates: generatedCertificates
    };
  }

  /**
   * Public Verification Lookup (Zero Authentication Required)
   * Sanitizes private data: exposes only Candidate Name, Course, Issue Date, Authority, Status.
   * Leverages Redis Cache with instant invalidation upon certificate cancellation.
   */
  static async verifyCertificate(queryCode: string) {
    const cleanCode = queryCode.trim().toUpperCase();
    const cacheKey = `cert:verify:${cleanCode}`;

    // 1. Check Redis / L1 Cache
    const cachedResult = await CacheService.get<any>(cacheKey);
    if (cachedResult) {
      return {
        ...cachedResult,
        fromCache: true
      };
    }

    let cert: any = null;

    if (isDbConnected()) {
      try {
        cert = await prisma.certificate.findFirst({
          where: {
            OR: [
              { certificateNumber: cleanCode },
              { verificationCode: cleanCode }
            ]
          },
          include: {
            candidate: { select: { fullName: true } },
            batch: { select: { courseName: true, courseCode: true, trainingCentre: { select: { name: true } }, district: { select: { name: true } } } }
          }
        });
      } catch (e) {}
    }

    if (!cert) {
      for (const c of inMemoryCertificates.values()) {
        if (c.certificateNumber.toUpperCase() === cleanCode || c.verificationCode.toUpperCase() === cleanCode) {
          cert = c;
          break;
        }
      }
    }

    if (!cert) {
      const notFoundResult = {
        isValid: false,
        status: 'NOT_FOUND',
        message: 'No digital certificate matching this certificate number or verification code was found.'
      };
      // Cache negative lookup briefly (60s) to protect against brute-force query storms
      await CacheService.set(cacheKey, notFoundResult, 60);
      return { ...notFoundResult, fromCache: false };
    }

    // Exception 4 Verification Check (Revocation)
    if (cert.status === CertificateStatus.CANCELLED) {
      const cancelledResult = {
        isValid: false,
        status: 'CANCELLED',
        certificateNumber: cert.certificateNumber,
        candidateName: cert.candidate?.fullName || cert.candidateName,
        courseName: cert.batch?.courseName || cert.courseName,
        courseCode: cert.batch?.courseCode || cert.courseCode,
        trainingCentre: cert.batch?.trainingCentre?.name || cert.trainingCentreName,
        district: cert.batch?.district?.name || cert.districtName,
        issueDate: cert.issueDate,
        cancelledAt: cert.cancelledAt,
        cancellationReason: cert.cancellationReason || 'Revoked by State Office compliance directive.',
        message: 'WARNING: This certificate was officially REVOKED / CANCELLED by the Pragati Skills Mission.'
      };

      // Cache revoked state
      await CacheService.set(cacheKey, cancelledResult, 3600);
      if (cert.certificateNumber) {
        await CacheService.set(`cert:verify:${cert.certificateNumber.toUpperCase()}`, cancelledResult, 3600);
      }
      if (cert.verificationCode) {
        await CacheService.set(`cert:verify:${cert.verificationCode.toUpperCase()}`, cancelledResult, 3600);
      }

      return { ...cancelledResult, fromCache: false };
    }

    const verifiedResult = {
      isValid: true,
      status: 'VERIFIED',
      certificateNumber: cert.certificateNumber,
      candidateName: cert.candidate?.fullName || cert.candidateName,
      courseName: cert.batch?.courseName || cert.courseName,
      courseCode: cert.batch?.courseCode || cert.courseCode,
      trainingCentre: cert.batch?.trainingCentre?.name || cert.trainingCentreName,
      district: cert.batch?.district?.name || cert.districtName,
      issueDate: cert.issueDate,
      issuingAuthority: cert.issuingAuthority || 'Pragati Skills Mission, Govt of India',
      message: 'Certificate authenticity successfully verified against the official National Register.'
    };

    // Cache verified state (1 hour TTL)
    await CacheService.set(cacheKey, verifiedResult, 3600);
    if (cert.certificateNumber) {
      await CacheService.set(`cert:verify:${cert.certificateNumber.toUpperCase()}`, verifiedResult, 3600);
    }
    if (cert.verificationCode) {
      await CacheService.set(`cert:verify:${cert.verificationCode.toUpperCase()}`, verifiedResult, 3600);
    }

    return { ...verifiedResult, fromCache: false };
  }

  /**
   * Candidate Direct Access (Secured by Unique Token)
   */
  static async getByAccessToken(token: string) {
    let cert: any = null;

    if (isDbConnected()) {
      try {
        cert = await prisma.certificate.findUnique({
          where: { accessToken: token },
          include: {
            candidate: true,
            batch: { include: { trainingCentre: true, district: true } }
          }
        });
      } catch (e) {}
    }

    if (!cert) {
      for (const c of inMemoryCertificates.values()) {
        if (c.accessToken === token) {
          cert = c;
          break;
        }
      }
    }

    if (!cert) {
      const err: any = new Error('Invalid or expired certificate access token.');
      err.statusCode = 404;
      throw err;
    }

    return cert;
  }
}
