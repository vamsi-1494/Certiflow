import prisma, { isDbConnected } from '../utils/prisma.js';

export interface CreateAuditLogParams {
  userId?: string;
  role?: string;
  action: string;
  batchId?: string;
  certificateId?: string;
  previousState?: string;
  newState?: string;
  reason?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

// In-memory audit log fallback
const memoryAuditLogs: any[] = [];

export class AuditService {
  static async record(params: CreateAuditLogParams): Promise<void> {
    const entry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: params.userId,
      role: params.role,
      action: params.action,
      batchId: params.batchId,
      certificateId: params.certificateId,
      previousState: params.previousState,
      newState: params.newState,
      reason: params.reason,
      ipAddress: params.ipAddress,
      metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
      createdAt: new Date()
    };

    memoryAuditLogs.unshift(entry);

    if (isDbConnected()) {
      try {
        await prisma.auditLog.create({
          data: {
            userId: params.userId,
            role: params.role,
            action: params.action,
            batchId: params.batchId,
            certificateId: params.certificateId,
            previousState: params.previousState,
            newState: params.newState,
            reason: params.reason,
            ipAddress: params.ipAddress,
            metadata: params.metadata ? JSON.stringify(params.metadata) : undefined
          }
        });
      } catch (error) {
        // Fallback recorded in memory
      }
    }
  }

  static async getLogs(filter: { batchId?: string; certificateId?: string; action?: string; limit?: number }) {
    if (isDbConnected()) {
      try {
        return await prisma.auditLog.findMany({
          where: {
            ...(filter.batchId ? { batchId: filter.batchId } : {}),
            ...(filter.certificateId ? { certificateId: filter.certificateId } : {}),
            ...(filter.action ? { action: filter.action } : {})
          },
          orderBy: { createdAt: 'desc' },
          take: filter.limit || 100,
          include: {
            user: { select: { id: true, name: true, email: true, role: true } }
          }
        });
      } catch (e) {
        // Fallback to memory
      }
    }

    let logs = [...memoryAuditLogs];
    if (filter.batchId) logs = logs.filter(l => l.batchId === filter.batchId);
    if (filter.certificateId) logs = logs.filter(l => l.certificateId === filter.certificateId);
    if (filter.action) logs = logs.filter(l => l.action === filter.action);
    return logs.slice(0, filter.limit || 100);
  }
}
