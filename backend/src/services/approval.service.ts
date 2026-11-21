import { BatchStatus, Role, ApprovalDecision, QualityDecision } from '@prisma/client';
import prisma, { isDbConnected } from '../utils/prisma.js';
import { AuditService } from './audit.service.js';
import { BatchService } from './batch.service.js';
import { AuthUserPayload } from '../types/auth.types.js';
import { SSEManager } from '../utils/sse.manager.js';

const LARGE_BATCH_THRESHOLD = parseInt(process.env.LARGE_BATCH_THRESHOLD || '50', 10);
const SLA_HOURS = parseInt(process.env.BATCH_OVERDUE_SLA_HOURS || '48', 10);

export class ApprovalService {
  /**
   * Helper: Check if batch has breached the SLA deadline
   */
  static isBatchOverdue(batch: any): boolean {
    if (!batch.submittedAt) return false;
    const submittedTime = new Date(batch.submittedAt).getTime();
    const now = Date.now();
    const diffHours = (now - submittedTime) / (1000 * 60 * 60);
    return diffHours > SLA_HOURS;
  }

  /**
   * 1. District Officer: Record Approval on a Batch (Dual-Custody Enforcement)
   */
  static async approveByDistrictOfficer(batchId: string, comments: string | undefined, user: AuthUserPayload, ipAddress?: string) {
    const batch = await BatchService.getBatchById(batchId, user);

    if (batch.status !== BatchStatus.DISTRICT_REVIEW) {
      const err: any = new Error(`Cannot approve batch in status '${batch.status}'. Batch must be in DISTRICT_REVIEW.`);
      err.statusCode = 400;
      throw err;
    }

    const currentRound = batch.currentApprovalRound || 1;

    // Check database or in-memory approvals
    if (isDbConnected()) {
      return await prisma.$transaction(async (tx) => {
        // Fetch existing approvals for this round
        const existingApprovals = await tx.batchApproval.findMany({
          where: { batchId, round: currentRound }
        });

        // Prevent the same officer from approving twice
        const alreadyApproved = existingApprovals.some(a => a.userId === user.userId);
        if (alreadyApproved) {
          const err: any = new Error(`Officer '${user.name}' has already approved this batch for Round ${currentRound}. A different district officer must provide the second approval.`);
          err.statusCode = 409;
          throw err;
        }

        // Record this officer's approval
        const newApproval = await tx.batchApproval.create({
          data: {
            batchId,
            userId: user.userId,
            round: currentRound,
            decision: ApprovalDecision.APPROVED,
            comments: comments || 'District verification complete.'
          }
        });

        const totalApprovals = existingApprovals.length + 1;
        let newState = batch.status;

        if (totalApprovals >= 2) {
          // Dual-approval threshold reached!
          // Check large batch threshold rule
          const candidateCount = batch.totalCandidates || batch.candidates?.length || 0;
          if (candidateCount > LARGE_BATCH_THRESHOLD) {
            newState = BatchStatus.QUALITY_REVIEW;
          } else {
            newState = BatchStatus.STATE_APPROVAL;
          }

          await tx.batch.update({
            where: { id: batchId },
            data: {
              status: newState,
              lastApprovedAt: new Date()
            }
          });
        }

        await AuditService.record({
          userId: user.userId,
          role: user.role,
          action: 'DISTRICT_APPROVED',
          batchId,
          previousState: batch.status,
          newState,
          reason: comments,
          ipAddress,
          metadata: {
            approvalCount: totalApprovals,
            requiredApprovals: 2,
            round: currentRound
          }
        });

        return {
          success: true,
          batchId,
          approvalsCount: totalApprovals,
          status: newState,
          message: totalApprovals >= 2
            ? `Batch received 2/2 district approvals and progressed to ${newState}.`
            : `First approval recorded (${user.name}). Batch is waiting for a 2nd district officer approval.`
        };
      });
    }

    // In-memory standalone fallback (ACID-safe in Node.js event loop)
    batch.approvals = batch.approvals || [];
    const roundApprovals = batch.approvals.filter((a: any) => (a.round || 1) === currentRound);

    const alreadyApproved = roundApprovals.some((a: any) => a.userId === user.userId || a.userName === user.name);
    if (alreadyApproved) {
      const err: any = new Error(`Officer '${user.name}' has already approved this batch for Round ${currentRound}. A different district officer must provide the second approval.`);
      err.statusCode = 409;
      throw err;
    }

    const approvalEntry = {
      id: `appr-${Date.now()}`,
      batchId,
      userId: user.userId,
      userName: user.name,
      userRole: user.role,
      round: currentRound,
      decision: ApprovalDecision.APPROVED,
      comments: comments || 'District verification complete.',
      createdAt: new Date()
    };
    batch.approvals.push(approvalEntry);

    const totalApprovals = roundApprovals.length + 1;
    let newState = batch.status;

    if (totalApprovals >= 2) {
      const candidateCount = batch.totalCandidates || batch.candidates?.length || 0;
      if (candidateCount > LARGE_BATCH_THRESHOLD) {
        newState = BatchStatus.QUALITY_REVIEW;
      } else {
        newState = BatchStatus.STATE_APPROVAL;
      }
      batch.status = newState;
      batch.lastApprovedAt = new Date();
    }

    await AuditService.record({
      userId: user.userId,
      role: user.role,
      action: 'DISTRICT_APPROVED',
      batchId,
      previousState: batch.status,
      newState,
      reason: comments,
      ipAddress,
      metadata: {
        approvalCount: totalApprovals,
        requiredApprovals: 2,
        round: currentRound
      }
    });

    SSEManager.broadcast('APPROVAL_RECORDED', {
      batchId,
      batchNumber: batch.batchNumber,
      approvalsCount: totalApprovals,
      status: newState,
      officer: user.name,
      round: currentRound
    });

    return {
      success: true,
      batchId,
      approvalsCount: totalApprovals,
      status: newState,
      message: totalApprovals >= 2
        ? `Batch received 2/2 district approvals and progressed to ${newState}.`
        : `First approval recorded (${user.name}). Batch is waiting for a 2nd district officer approval.`
    };
  }

  /**
   * 2. District Officer: Reject Batch (Mandatory Reason)
   */
  static async rejectByDistrictOfficer(batchId: string, reason: string, user: AuthUserPayload, ipAddress?: string) {
    if (!reason || reason.trim().length < 5) {
      const err: any = new Error('A detailed rejection reason (minimum 5 characters) is mandatory.');
      err.statusCode = 400;
      throw err;
    }

    const batch = await BatchService.getBatchById(batchId, user);
    if (batch.status !== BatchStatus.DISTRICT_REVIEW) {
      const err: any = new Error(`Cannot reject batch with status '${batch.status}'. Batch must be in DISTRICT_REVIEW.`);
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
      action: 'DISTRICT_REJECTED',
      batchId,
      previousState,
      newState,
      reason,
      ipAddress
    });

    SSEManager.broadcast('BATCH_STATUS_UPDATED', {
      batchId,
      batchNumber: batch.batchNumber,
      status: newState,
      reason,
      officer: user.name
    });

    return {
      success: true,
      batchId,
      status: newState,
      message: `Batch '${batch.batchNumber}' has been rejected.`
    };
  }

  /**
   * 3. District Officer: Send Batch Back for Correction
   */
  static async returnForCorrection(batchId: string, reason: string, user: AuthUserPayload, ipAddress?: string) {
    if (!reason || reason.trim().length < 5) {
      const err: any = new Error('A specific correction reason (minimum 5 characters) is mandatory.');
      err.statusCode = 400;
      throw err;
    }

    const batch = await BatchService.getBatchById(batchId, user);
    if (batch.status !== BatchStatus.DISTRICT_REVIEW) {
      const err: any = new Error(`Cannot return batch with status '${batch.status}'. Batch must be in DISTRICT_REVIEW.`);
      err.statusCode = 400;
      throw err;
    }

    const previousState = batch.status;
    const newState = BatchStatus.RETURNED_FOR_CORRECTION;

    if (isDbConnected()) {
      try {
        await prisma.batch.update({
          where: { id: batchId },
          data: { status: newState, correctionReason: reason }
        });
      } catch (e) {
        batch.status = newState;
        batch.correctionReason = reason;
      }
    } else {
      batch.status = newState;
      batch.correctionReason = reason;
    }

    await AuditService.record({
      userId: user.userId,
      role: user.role,
      action: 'RETURNED_FOR_CORRECTION',
      batchId,
      previousState,
      newState,
      reason,
      ipAddress
    });

    SSEManager.broadcast('BATCH_STATUS_UPDATED', {
      batchId,
      batchNumber: batch.batchNumber,
      status: newState,
      reason,
      officer: user.name
    });

    return {
      success: true,
      batchId,
      status: newState,
      message: `Batch returned to Training Centre for candidate corrections.`
    };
  }

  /**
   * 4. Quality Team (Neha): Inspect and Approve Large Batch
   */
  static async approveQualityReview(batchId: string, notes: string | undefined, user: AuthUserPayload, ipAddress?: string) {
    const batch = await BatchService.getBatchById(batchId, user);
    if (batch.status !== BatchStatus.QUALITY_REVIEW) {
      const err: any = new Error(`Cannot perform quality review on batch with status '${batch.status}'. Batch must be in QUALITY_REVIEW.`);
      err.statusCode = 400;
      throw err;
    }

    const previousState = batch.status;
    const newState = BatchStatus.STATE_APPROVAL;

    if (isDbConnected()) {
      try {
        await prisma.$transaction([
          prisma.qualityReview.create({
            data: {
              batchId,
              reviewerId: user.userId,
              decision: QualityDecision.APPROVED,
              notes: notes || 'Batch candidate samples verified against training records.'
            }
          }),
          prisma.batch.update({
            where: { id: batchId },
            data: { status: newState }
          })
        ]);
      } catch (e) {
        batch.status = newState;
      }
    } else {
      batch.status = newState;
      batch.qualityReviews = batch.qualityReviews || [];
      batch.qualityReviews.push({
        id: `qa-${Date.now()}`,
        reviewerName: user.name,
        decision: QualityDecision.APPROVED,
        notes: notes || 'Batch candidate samples verified against training records.',
        createdAt: new Date()
      });
    }

    await AuditService.record({
      userId: user.userId,
      role: user.role,
      action: 'QUALITY_APPROVED',
      batchId,
      previousState,
      newState,
      reason: notes,
      ipAddress
    });

    SSEManager.broadcast('QUALITY_REVIEW_COMPLETED', {
      batchId,
      batchNumber: batch.batchNumber,
      status: newState,
      decision: 'APPROVED',
      reviewer: user.name
    });

    return {
      success: true,
      batchId,
      status: newState,
      message: 'Quality review approved. Batch has advanced to State Office for final approval.'
    };
  }

  /**
   * 5. Quality Team (Neha): Reject Quality Review
   */
  static async rejectQualityReview(batchId: string, reason: string, user: AuthUserPayload, ipAddress?: string) {
    if (!reason || reason.trim().length < 5) {
      const err: any = new Error('A detailed quality audit rejection reason is mandatory.');
      err.statusCode = 400;
      throw err;
    }

    const batch = await BatchService.getBatchById(batchId, user);
    if (batch.status !== BatchStatus.QUALITY_REVIEW) {
      const err: any = new Error(`Cannot reject quality review on batch with status '${batch.status}'. Batch must be in QUALITY_REVIEW.`);
      err.statusCode = 400;
      throw err;
    }

    const previousState = batch.status;
    const newState = BatchStatus.QUALITY_REJECTED;

    if (isDbConnected()) {
      try {
        await prisma.$transaction([
          prisma.qualityReview.create({
            data: {
              batchId,
              reviewerId: user.userId,
              decision: QualityDecision.REJECTED,
              notes: reason
            }
          }),
          prisma.batch.update({
            where: { id: batchId },
            data: { status: newState, rejectionReason: reason }
          })
        ]);
      } catch (e) {
        batch.status = newState;
        batch.rejectionReason = reason;
      }
    } else {
      batch.status = newState;
      batch.rejectionReason = reason;
      batch.qualityReviews = batch.qualityReviews || [];
      batch.qualityReviews.push({
        id: `qa-${Date.now()}`,
        reviewerName: user.name,
        decision: QualityDecision.REJECTED,
        notes: reason,
        createdAt: new Date()
      });
    }

    await AuditService.record({
      userId: user.userId,
      role: user.role,
      action: 'QUALITY_REJECTED',
      batchId,
      previousState,
      newState,
      reason,
      ipAddress
    });

    SSEManager.broadcast('QUALITY_REVIEW_COMPLETED', {
      batchId,
      batchNumber: batch.batchNumber,
      status: newState,
      decision: 'REJECTED',
      reason,
      reviewer: user.name
    });

    return {
      success: true,
      batchId,
      status: newState,
      message: 'Quality review rejected. Batch marked as QUALITY_REJECTED.'
    };
  }

  /**
   * 6. District Officer Dashboard Statistics & Batches
   */
  static async getDistrictDashboard(user: AuthUserPayload) {
    const allBatches = await BatchService.getBatches({}, user);

    const pending = allBatches.filter((b: any) => b.status === BatchStatus.DISTRICT_REVIEW);
    const overdue = pending.filter((b: any) => this.isBatchOverdue(b));

    // Determine for each batch if current user has already signed it
    const enhanced = allBatches.map((b: any) => {
      const roundApprovals = (b.approvals || []).filter((a: any) => (a.round || 1) === (b.currentApprovalRound || 1));
      const hasApproved = roundApprovals.some((a: any) => a.userId === user.userId || a.userName === user.name);
      return {
        ...b,
        isOverdue: this.isBatchOverdue(b),
        approvalsInRound: roundApprovals.length,
        hasCurrentUserApproved: hasApproved,
        approvers: roundApprovals.map((a: any) => a.user?.name || a.userName)
      };
    });

    return {
      stats: {
        totalBatches: allBatches.length,
        pendingReview: pending.length,
        overdueCount: overdue.length,
        approvedCount: allBatches.filter((b: any) => [BatchStatus.STATE_APPROVAL, BatchStatus.APPROVED, BatchStatus.ISSUED].includes(b.status)).length
      },
      batches: enhanced
    };
  }

  /**
   * 7. Quality Team Dashboard Statistics & Batches
   */
  static async getQualityDashboard(user: AuthUserPayload) {
    const allBatches = await BatchService.getBatches({}, user);
    const pendingQA = allBatches.filter((b: any) => b.status === BatchStatus.QUALITY_REVIEW);

    return {
      stats: {
        pendingQualityReview: pendingQA.length,
        largeBatchThreshold: LARGE_BATCH_THRESHOLD,
        reviewedCount: allBatches.filter((b: any) => [BatchStatus.STATE_APPROVAL, BatchStatus.APPROVED, BatchStatus.ISSUED].includes(b.status) && (b.totalCandidates || 0) > LARGE_BATCH_THRESHOLD).length
      },
      batches: pendingQA
    };
  }
}
