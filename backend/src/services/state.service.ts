import { BatchStatus, CertificateStatus, Role } from '@prisma/client';
import prisma, { isDbConnected } from '../utils/prisma.js';
import { AuditService } from './audit.service.js';
import { BatchService } from './batch.service.js';
import { ApprovalService } from './approval.service.js';
import { QueueManager } from '../queues/queue.manager.js';
import { AuthUserPayload } from '../types/auth.types.js';
import { inMemoryCertificates as memoryCertificates } from '../utils/credential.store.js';
import { CacheService } from './cache.service.js';
import { SSEManager } from '../utils/sse.manager.js';

export class StateService {
  /**
   * 1. State Office Dashboard Overview
   */
  static async getStateDashboard(user: AuthUserPayload) {
    const allBatches = await BatchService.getBatches({}, user);
    const pendingApproval = allBatches.filter((b: any) => b.status === BatchStatus.STATE_APPROVAL);
    const overdueBatches = allBatches.filter((b: any) => ApprovalService.isBatchOverdue(b));

    const certificates = await this.getAllCertificates();

    return {
      stats: {
        totalBatches: allBatches.length,
        pendingFinalApproval: pendingApproval.length,
        overdueCount: overdueBatches.length,
        issuedCertificatesCount: certificates.filter((c: any) => c.status === CertificateStatus.ISSUED).length,
        cancelledCertificatesCount: certificates.filter((c: any) => c.status === CertificateStatus.CANCELLED).length
      },
      pendingBatches: pendingApproval,
      overdueBatches,
      recentCertificates: certificates.slice(0, 20)
    };
  }

  /**
   * 2. Final Approval by State Office (Farah)
   */
  static async finalApproveBatch(batchId: string, comments: string | undefined, user: AuthUserPayload, ipAddress?: string) {
    const batch = await BatchService.getBatchById(batchId, user);

    if (batch.status !== BatchStatus.STATE_APPROVAL) {
      const err: any = new Error(`Cannot grant final approval to batch in status '${batch.status}'. Batch must be in STATE_APPROVAL.`);
      err.statusCode = 400;
      throw err;
    }

    const previousState = batch.status;
    const newState = BatchStatus.APPROVED;

    if (isDbConnected()) {
      try {
        await prisma.batch.update({
          where: { id: batchId },
          data: {
            status: newState,
            lastApprovedAt: new Date()
          }
        });
      } catch (e) {
        batch.status = newState;
        batch.lastApprovedAt = new Date();
      }
    } else {
      batch.status = newState;
      batch.lastApprovedAt = new Date();
    }

    await AuditService.record({
      userId: user.userId,
      role: user.role,
      action: 'STATE_FINAL_APPROVED',
      batchId,
      previousState,
      newState,
      reason: comments || 'State Office executive verification verified. Approved for certificate issuance.',
      ipAddress,
      metadata: { approver: user.name }
    });

    // Enqueue background asynchronous certificate generation & simulated WhatsApp jobs
    await QueueManager.enqueueCertificateGeneration(batchId);

    // Real-Time Notification via Server-Sent Events (SSE)
    SSEManager.broadcast('BATCH_APPROVED', {
      batchId,
      batchNumber: batch.batchNumber,
      status: newState,
      approver: user.name
    });

    return {
      success: true,
      batchId,
      status: newState,
      message: `Batch '${batch.batchNumber}' has received final State Office approval! Certificate generation event has been queued.`
    };
  }

  /**
   * 3. Final Rejection by State Office
   */
  static async finalRejectBatch(batchId: string, reason: string, user: AuthUserPayload, ipAddress?: string) {
    if (!reason || reason.trim().length < 5) {
      const err: any = new Error('A detailed state rejection reason is mandatory.');
      err.statusCode = 400;
      throw err;
    }

    const batch = await BatchService.getBatchById(batchId, user);

    if (batch.status !== BatchStatus.STATE_APPROVAL) {
      const err: any = new Error(`Cannot reject batch in status '${batch.status}'. Batch must be in STATE_APPROVAL.`);
      err.statusCode = 400;
      throw err;
    }

    const previousState = batch.status;
    const newState = BatchStatus.REJECTED;

    if (isDbConnected()) {
      try {
        await prisma.batch.update({
          where: { id: batchId },
          data: { status: newState, rejectionReason: reason }
        });
      } catch (e) {
        batch.status = newState;
        batch.rejectionReason = reason;
      }
    } else {
      batch.status = newState;
      batch.rejectionReason = reason;
    }

    await AuditService.record({
      userId: user.userId,
      role: user.role,
      action: 'STATE_FINAL_REJECTED',
      batchId,
      previousState,
      newState,
      reason,
      ipAddress
    });

    SSEManager.broadcast('BATCH_REJECTED', {
      batchId,
      batchNumber: batch.batchNumber,
      status: newState,
      reason,
      approver: user.name
    });

    return {
      success: true,
      batchId,
      status: newState,
      message: `Batch '${batch.batchNumber}' has been rejected by State Office.`
    };
  }

  /**
   * 4. Certificate Cancellation (Revocation Authority)
   */
  static async cancelCertificate(certificateId: string, reason: string, user: AuthUserPayload, ipAddress?: string) {
    if (!reason || reason.trim().length < 5) {
      const err: any = new Error('A mandatory reason is required for certificate revocation.');
      err.statusCode = 400;
      throw err;
    }

    let certificate: any = null;

    if (isDbConnected()) {
      try {
        certificate = await prisma.certificate.findUnique({
          where: { id: certificateId },
          include: { candidate: true, batch: true }
        });
      } catch (e) {}
    }

    if (!certificate) {
      certificate = memoryCertificates.get(certificateId);
      if (!certificate) {
        // Search by certificateNumber
        for (const c of memoryCertificates.values()) {
          if (c.certificateNumber === certificateId) {
            certificate = c;
            break;
          }
        }
      }
    }

    if (!certificate) {
      const err: any = new Error(`Certificate '${certificateId}' not found.`);
      err.statusCode = 404;
      throw err;
    }

    if (certificate.status === CertificateStatus.CANCELLED) {
      const err: any = new Error(`Certificate '${certificate.certificateNumber}' is already cancelled.`);
      err.statusCode = 400;
      throw err;
    }

    const now = new Date();

    if (isDbConnected()) {
      try {
        await prisma.certificate.update({
          where: { id: certificate.id },
          data: {
            status: CertificateStatus.CANCELLED,
            cancellationReason: reason,
            cancelledAt: now,
            cancelledByUserId: user.userId
          }
        });
      } catch (e) {
        certificate.status = CertificateStatus.CANCELLED;
        certificate.cancellationReason = reason;
        certificate.cancelledAt = now;
        certificate.cancelledBy = `${user.name} (${user.role})`;
      }
    } else {
      certificate.status = CertificateStatus.CANCELLED;
      certificate.cancellationReason = reason;
      certificate.cancelledAt = now;
      certificate.cancelledBy = `${user.name} (${user.role})`;
      memoryCertificates.set(certificate.id, certificate);
    }

    await AuditService.record({
      userId: user.userId,
      role: user.role,
      action: 'CERTIFICATE_CANCELLED',
      batchId: certificate.batchId,
      certificateId: certificate.id,
      previousState: CertificateStatus.ISSUED,
      newState: CertificateStatus.CANCELLED,
      reason,
      ipAddress,
      metadata: { certificateNumber: certificate.certificateNumber }
    });

    // Instant Cache Invalidation: Purge both certificateNumber and verificationCode
    const certNum = certificate.certificateNumber.toUpperCase();
    await CacheService.del(`cert:verify:${certNum}`);
    if (certificate.verificationCode) {
      await CacheService.del(`cert:verify:${certificate.verificationCode.toUpperCase()}`);
    }

    // Real-Time Notification via Server-Sent Events (SSE)
    SSEManager.broadcast('CERTIFICATE_CANCELLED', {
      certificateId: certificate.id,
      certificateNumber: certificate.certificateNumber,
      candidateName: certificate.candidateName || certificate.candidate?.fullName,
      reason,
      cancelledBy: user.name
    });

    return {
      success: true,
      certificateNumber: certificate.certificateNumber,
      status: CertificateStatus.CANCELLED,
      cancellationReason: reason,
      cancelledAt: now,
      message: `Certificate '${certificate.certificateNumber}' has been revoked. Public verification will immediately reflect CANCELLED status.`
    };
  }

  /**
   * 5. Get All Certificates
   */
  static async getAllCertificates(status?: CertificateStatus) {
    if (isDbConnected()) {
      try {
        const certs = await prisma.certificate.findMany({
          where: status ? { status } : {},
          include: {
            candidate: true,
            batch: { select: { batchNumber: true, courseName: true, courseCode: true } },
            cancelledBy: { select: { name: true, role: true } }
          },
          orderBy: { issueDate: 'desc' }
        });
        return certs;
      } catch (e) {}
    }

    let list = Array.from(memoryCertificates.values());
    if (status) {
      list = list.filter(c => c.status === status);
    }
    return list;
  }

  /**
   * 6. Audit Log Explorer
   */
  static async getAuditLogs(filters: { batchId?: string; certificateId?: string; action?: string; limit?: number }) {
    return AuditService.getLogs(filters);
  }
}
