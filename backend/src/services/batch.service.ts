import { BatchStatus, Role } from '@prisma/client';
import prisma, { isDbConnected } from '../utils/prisma.js';
import { SpreadsheetValidator, SpreadsheetValidationResult } from '../validators/spreadsheet.validator.js';
import { AuditService } from './audit.service.js';
import { AuthUserPayload } from '../types/auth.types.js';
import { SSEManager } from '../utils/sse.manager.js';

// In-Memory store fallback for standalone test / dev environment
const memoryBatches: Map<string, any> = new Map();

// Initialize in-memory seed batches for immediate standalone usability
const initMemoryStore = () => {
  if (memoryBatches.size > 0) return;

  const sample1 = {
    id: 'batch-001',
    batchNumber: 'BATCH-2026-001',
    courseName: 'Solar Panel Installation Technician',
    courseCode: 'SPIT-101',
    trainingCentreId: 'tc-bpl-001',
    trainingCentreName: 'Apex Skill Development Centre',
    districtId: 'bhopal-dist-id',
    districtName: 'Bhopal',
    status: BatchStatus.SUBMITTED,
    totalCandidates: 10,
    currentApprovalRound: 1,
    rejectionReason: null,
    correctionReason: null,
    submittedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    approvals: [],
    candidates: Array.from({ length: 10 }, (_, i) => ({
      id: `cand-1-${i + 1}`,
      batchId: 'batch-001',
      fullName: `Candidate Small ${i + 1}`,
      guardianName: `Guardian ${i + 1}`,
      dateOfBirth: '2001-05-15',
      gender: i % 2 === 0 ? 'Male' : 'Female',
      mobileNumber: `91000000${i.toString().padStart(2, '0')}`,
      aadhaarLast4: (1000 + i).toString().slice(-4),
      courseCode: 'SPIT-101',
      trainingCompletionDate: new Date('2026-01-30')
    }))
  };

  const sample4 = {
    id: 'batch-004',
    batchNumber: 'BATCH-2026-004',
    courseName: 'Data Entry & Office Automation',
    courseCode: 'DEOA-104',
    trainingCentreId: 'tc-bpl-001',
    trainingCentreName: 'Apex Skill Development Centre',
    districtId: 'bhopal-dist-id',
    districtName: 'Bhopal',
    status: BatchStatus.RETURNED_FOR_CORRECTION,
    totalCandidates: 2,
    currentApprovalRound: 1,
    rejectionReason: null,
    correctionReason: 'Candidate 1 has a typo in Aadhaar digits. Please verify against physical copy.',
    submittedAt: new Date(Date.now() - 3600000 * 48),
    createdAt: new Date(Date.now() - 3600000 * 48),
    updatedAt: new Date(),
    approvals: [],
    candidates: [
      {
        id: 'cand-4-1',
        batchId: 'batch-004',
        fullName: 'Aarav Patel',
        guardianName: 'Sanjay Patel',
        dateOfBirth: '2002-04-12',
        gender: 'Male',
        mobileNumber: '9823456789',
        aadhaarLast4: '0000',
        courseCode: 'DEOA-104',
        trainingCompletionDate: new Date('2026-01-20')
      },
      {
        id: 'cand-4-2',
        batchId: 'batch-004',
        fullName: 'Pooja Verma',
        guardianName: 'Rajesh Verma',
        dateOfBirth: '2001-09-18',
        gender: 'Female',
        mobileNumber: '9834567890',
        aadhaarLast4: '4321',
        courseCode: 'DEOA-104',
        trainingCompletionDate: new Date('2026-01-20')
      }
    ]
  };

  memoryBatches.set(sample1.id, sample1);
  memoryBatches.set(sample4.id, sample4);
};

initMemoryStore();

export class BatchService {
  /**
   * 1. Create a new batch in DRAFT status
   */
  static async createBatch(data: { courseName: string; courseCode: string; districtId?: string }, user: AuthUserPayload, ipAddress?: string) {
    if (!data.courseName || !data.courseCode) {
      const err: any = new Error('Course Name and Course Code are required.');
      err.statusCode = 400;
      throw err;
    }

    const batchNumber = `BATCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const batchId = `batch-${Date.now()}`;

    const newBatch = {
      id: batchId,
      batchNumber,
      courseName: data.courseName,
      courseCode: data.courseCode,
      trainingCentreId: user.trainingCentreId || 'tc-bpl-001',
      trainingCentreName: 'Apex Skill Development Centre',
      districtId: data.districtId || user.districtId || 'bhopal-dist-id',
      districtName: 'Bhopal',
      status: BatchStatus.DRAFT,
      totalCandidates: 0,
      currentApprovalRound: 1,
      rejectionReason: null,
      correctionReason: null,
      submittedAt: null,
      candidates: [],
      approvals: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (isDbConnected()) {
      try {
        const dbBatch = await prisma.batch.create({
          data: {
            batchNumber,
            courseName: data.courseName,
            courseCode: data.courseCode,
            trainingCentreId: user.trainingCentreId || 'tc-bpl-001',
            districtId: data.districtId || user.districtId || 'bhopal-dist-id',
            status: BatchStatus.DRAFT
          }
        });
        newBatch.id = dbBatch.id;
      } catch (e) {
        memoryBatches.set(batchId, newBatch);
      }
    } else {
      memoryBatches.set(batchId, newBatch);
    }

    await AuditService.record({
      userId: user.userId,
      role: user.role,
      action: 'BATCH_CREATED',
      batchId: newBatch.id,
      newState: BatchStatus.DRAFT,
      ipAddress,
      metadata: { batchNumber, courseCode: data.courseCode }
    });

    return newBatch;
  }

  /**
   * 2. Validate Spreadsheet Only (Pre-upload Dry Run)
   */
  static validateSpreadsheet(buffer: Buffer): SpreadsheetValidationResult {
    return SpreadsheetValidator.parseAndValidate(buffer);
  }

  /**
   * 3. Upload and attach candidates to batch (All-or-Nothing Rule)
   */
  static async uploadCandidates(batchId: string, buffer: Buffer, user: AuthUserPayload, ipAddress?: string) {
    const batch = await this.getBatchById(batchId, user);

    if (batch.status !== BatchStatus.DRAFT && batch.status !== BatchStatus.RETURNED_FOR_CORRECTION) {
      const err: any = new Error(`Cannot upload spreadsheet to batch with status '${batch.status}'. Batch must be DRAFT or RETURNED_FOR_CORRECTION.`);
      err.statusCode = 400;
      throw err;
    }

    // Run All-or-Nothing validation
    const result = SpreadsheetValidator.parseAndValidate(buffer);

    if (!result.isValid) {
      const err: any = new Error(`Spreadsheet validation failed with ${result.invalidRows} invalid row(s). No records were saved.`);
      err.statusCode = 422;
      err.code = 'INVALID_SPREADSHEET';
      err.details = {
        totalRows: result.totalRows,
        validRows: result.validRows,
        invalidRows: result.invalidRows,
        errors: result.errors
      };
      throw err;
    }

    // All rows valid: Insert candidates atomically
    if (isDbConnected()) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.candidate.deleteMany({ where: { batchId } });
          await tx.candidate.createMany({
            data: result.candidates.map(c => ({
              batchId,
              fullName: c.fullName,
              guardianName: c.guardianName,
              dateOfBirth: c.dateOfBirth,
              gender: c.gender,
              mobileNumber: c.mobileNumber,
              aadhaarLast4: c.aadhaarLast4,
              courseCode: c.courseCode,
              trainingCompletionDate: new Date(c.trainingCompletionDate)
            }))
          });
          await tx.batch.update({
            where: { id: batchId },
            data: { totalCandidates: result.candidates.length }
          });
        });
      } catch (dbErr) {
        // Fallback to memory
        const inMem = memoryBatches.get(batchId) || batch;
        inMem.candidates = result.candidates.map((c, i) => ({
          id: `cand-${Date.now()}-${i}`,
          batchId,
          ...c,
          trainingCompletionDate: new Date(c.trainingCompletionDate)
        }));
        inMem.totalCandidates = inMem.candidates.length;
        inMem.updatedAt = new Date();
        memoryBatches.set(batchId, inMem);
      }
    } else {
      const inMem = memoryBatches.get(batchId) || batch;
      inMem.candidates = result.candidates.map((c, i) => ({
        id: `cand-${Date.now()}-${i}`,
        batchId,
        ...c,
        trainingCompletionDate: new Date(c.trainingCompletionDate)
      }));
      inMem.totalCandidates = inMem.candidates.length;
      inMem.updatedAt = new Date();
      memoryBatches.set(batchId, inMem);
    }

    await AuditService.record({
      userId: user.userId,
      role: user.role,
      action: 'SPREADSHEET_UPLOADED',
      batchId,
      ipAddress,
      metadata: { candidateCount: result.candidates.length }
    });

    return {
      success: true,
      totalCandidates: result.candidates.length,
      message: `Successfully validated and imported ${result.candidates.length} candidates.`
    };
  }

  /**
   * 4. Submit Batch for District Officer Review
   */
  static async submitBatch(batchId: string, user: AuthUserPayload, ipAddress?: string) {
    const batch = await this.getBatchById(batchId, user);

    if (batch.status !== BatchStatus.DRAFT) {
      const err: any = new Error(`Only batches in DRAFT status can be submitted. Current status: '${batch.status}'`);
      err.statusCode = 400;
      throw err;
    }

    if (!batch.candidates || batch.candidates.length === 0) {
      const err: any = new Error('Cannot submit an empty batch. Please upload candidate records first.');
      err.statusCode = 400;
      throw err;
    }

    const previousState = batch.status;
    const newState = BatchStatus.DISTRICT_REVIEW;

    if (isDbConnected()) {
      try {
        await prisma.batch.update({
          where: { id: batchId },
          data: {
            status: BatchStatus.DISTRICT_REVIEW,
            submittedAt: new Date()
          }
        });
      } catch (dbErr) {
        const inMem = memoryBatches.get(batchId);
        if (inMem) {
          inMem.status = BatchStatus.DISTRICT_REVIEW;
          inMem.submittedAt = new Date();
          inMem.updatedAt = new Date();
          memoryBatches.set(batchId, inMem);
        }
      }
    } else {
      const inMem = memoryBatches.get(batchId);
      if (inMem) {
        inMem.status = BatchStatus.DISTRICT_REVIEW;
        inMem.submittedAt = new Date();
        inMem.updatedAt = new Date();
        memoryBatches.set(batchId, inMem);
      }
    }

    await AuditService.record({
      userId: user.userId,
      role: user.role,
      action: 'BATCH_SUBMITTED',
      batchId,
      previousState,
      newState,
      ipAddress
    });

    SSEManager.broadcast('BATCH_STATUS_UPDATED', {
      batchId,
      batchNumber: batch.batchNumber,
      status: BatchStatus.DISTRICT_REVIEW,
      action: 'BATCH_SUBMITTED',
      centreName: batch.trainingCentre?.name || batch.trainingCentreName,
      updatedBy: user.name
    });

    return {
      success: true,
      batchId,
      status: BatchStatus.DISTRICT_REVIEW,
      message: 'Batch submitted successfully. Now queued for District Officer dual-approval.'
    };
  }

  /**
   * 5. Get Batches (Filtered by User Role & Scope)
   */
  static async getBatches(filters: { status?: BatchStatus; search?: string }, user: AuthUserPayload) {
    if (isDbConnected()) {
      try {
        const where: any = {};
        if (filters.status) where.status = filters.status;
        if (user.role === Role.TRAINING_CENTRE && user.trainingCentreId) {
          where.trainingCentreId = user.trainingCentreId;
        }
        if (user.role === Role.DISTRICT_OFFICER && user.districtId) {
          where.districtId = user.districtId;
        }

        const batches = await prisma.batch.findMany({
          where,
          include: {
            trainingCentre: { select: { name: true, centreCode: true } },
            district: { select: { name: true, code: true } },
            approvals: true,
            _count: { select: { candidates: true } }
          },
          orderBy: { createdAt: 'desc' }
        });
        return batches;
      } catch (dbErr) {
        // Fallback to memory
      }
    }

    let list = Array.from(memoryBatches.values());
    if (filters.status) {
      list = list.filter(b => b.status === filters.status);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(b => b.batchNumber.toLowerCase().includes(q) || b.courseName.toLowerCase().includes(q));
    }
    return list;
  }

  /**
   * 6. Get Batch Details by ID
   */
  static async getBatchById(batchId: string, user: AuthUserPayload) {
    if (isDbConnected()) {
      try {
        const batch = await prisma.batch.findUnique({
          where: { id: batchId },
          include: {
            trainingCentre: true,
            district: true,
            candidates: true,
            approvals: { include: { user: { select: { id: true, name: true, email: true } } } },
            qualityReviews: { include: { reviewer: { select: { id: true, name: true, email: true } } } },
            auditLogs: { orderBy: { createdAt: 'desc' } }
          }
        });

        if (batch) return batch;
      } catch (dbErr) {
        // Fallback to memory
      }
    }

    const inMem = memoryBatches.get(batchId);
    if (!inMem) {
      const err: any = new Error(`Batch '${batchId}' not found.`);
      err.statusCode = 404;
      throw err;
    }
    return inMem;
  }

  /**
   * 7. Correct individual candidate data (For Returned Batches)
   */
  static async updateCandidate(batchId: string, candidateId: string, data: Partial<any>, user: AuthUserPayload, ipAddress?: string) {
    const batch = await this.getBatchById(batchId, user);

    if (batch.status !== BatchStatus.RETURNED_FOR_CORRECTION && batch.status !== BatchStatus.DRAFT) {
      const err: any = new Error(`Candidates can only be edited when batch is DRAFT or RETURNED_FOR_CORRECTION.`);
      err.statusCode = 400;
      throw err;
    }

    if (isDbConnected()) {
      try {
        await prisma.candidate.update({
          where: { id: candidateId },
          data
        });
      } catch (dbErr) {
        // In-memory update
        const inMem = memoryBatches.get(batchId);
        if (inMem && inMem.candidates) {
          const idx = inMem.candidates.findIndex((c: any) => c.id === candidateId);
          if (idx !== -1) {
            inMem.candidates[idx] = { ...inMem.candidates[idx], ...data };
          }
        }
      }
    } else {
      const inMem = memoryBatches.get(batchId);
      if (inMem && inMem.candidates) {
        const idx = inMem.candidates.findIndex((c: any) => c.id === candidateId);
        if (idx !== -1) {
          inMem.candidates[idx] = { ...inMem.candidates[idx], ...data };
        }
      }
    }

    await AuditService.record({
      userId: user.userId,
      role: user.role,
      action: 'CANDIDATE_CORRECTED',
      batchId,
      ipAddress,
      metadata: { candidateId, changes: data }
    });

    return { success: true, message: 'Candidate details updated successfully.' };
  }

  /**
   * 8. Resubmit Corrected Batch (Starts a Fresh Approval Round)
   */
  static async resubmitBatch(batchId: string, user: AuthUserPayload, ipAddress?: string) {
    const batch = await this.getBatchById(batchId, user);

    if (batch.status !== BatchStatus.RETURNED_FOR_CORRECTION) {
      const err: any = new Error(`Only batches in 'RETURNED_FOR_CORRECTION' status can be resubmitted. Current status: '${batch.status}'`);
      err.statusCode = 400;
      throw err;
    }

    const nextRound = (batch.currentApprovalRound || 1) + 1;
    const previousState = batch.status;
    const newState = BatchStatus.DISTRICT_REVIEW;

    if (isDbConnected()) {
      try {
        await prisma.batch.update({
          where: { id: batchId },
          data: {
            status: BatchStatus.DISTRICT_REVIEW,
            currentApprovalRound: nextRound,
            correctionReason: null,
            submittedAt: new Date()
          }
        });
      } catch (dbErr) {
        const inMem = memoryBatches.get(batchId);
        if (inMem) {
          inMem.status = BatchStatus.DISTRICT_REVIEW;
          inMem.currentApprovalRound = nextRound;
          inMem.correctionReason = null;
          inMem.submittedAt = new Date();
          inMem.updatedAt = new Date();
          memoryBatches.set(batchId, inMem);
        }
      }
    } else {
      const inMem = memoryBatches.get(batchId);
      if (inMem) {
        inMem.status = BatchStatus.DISTRICT_REVIEW;
        inMem.currentApprovalRound = nextRound;
        inMem.correctionReason = null;
        inMem.submittedAt = new Date();
        inMem.updatedAt = new Date();
        memoryBatches.set(batchId, inMem);
      }
    }

    await AuditService.record({
      userId: user.userId,
      role: user.role,
      action: 'BATCH_RESUBMITTED',
      batchId,
      previousState,
      newState,
      ipAddress,
      metadata: { round: nextRound, message: 'Resubmitted after corrections. Fresh approval round started.' }
    });

    SSEManager.broadcast('BATCH_STATUS_UPDATED', {
      batchId,
      batchNumber: batch.batchNumber,
      status: BatchStatus.DISTRICT_REVIEW,
      action: 'BATCH_RESUBMITTED',
      round: nextRound,
      updatedBy: user.name
    });

    return {
      success: true,
      batchId,
      round: nextRound,
      status: BatchStatus.DISTRICT_REVIEW,
      message: `Batch resubmitted for Approval Round ${nextRound}. Prior round approvals have been archived in audit history.`
    };
  }

  /**
   * 9. Training Centre Dashboard Statistics
   */
  static async getStatistics(user: AuthUserPayload) {
    const all = await this.getBatches({}, user);
    return {
      totalBatches: all.length,
      draftBatches: all.filter((b: any) => b.status === BatchStatus.DRAFT).length,
      inReviewBatches: all.filter((b: any) => [BatchStatus.SUBMITTED, BatchStatus.DISTRICT_REVIEW, BatchStatus.QUALITY_REVIEW, BatchStatus.STATE_APPROVAL].includes(b.status)).length,
      returnedBatches: all.filter((b: any) => b.status === BatchStatus.RETURNED_FOR_CORRECTION).length,
      approvedBatches: all.filter((b: any) => [BatchStatus.APPROVED, BatchStatus.CERTIFICATE_GENERATION, BatchStatus.ISSUED].includes(b.status)).length
    };
  }
}
