import { Request, Response, NextFunction } from 'express';
import { StateService } from '../services/state.service.js';
import { CertificateStatus } from '@prisma/client';

export class StateController {
  /**
   * GET /api/state/dashboard
   */
  static async getStateDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await StateService.getStateDashboard(req.user!);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/state/batches/:id/approve
   */
  static async finalApprove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { comments } = req.body;
      const clientIp = req.ip || req.socket.remoteAddress;
      const result = await StateService.finalApproveBatch(req.params.id, comments, req.user!, clientIp);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/state/batches/:id/reject
   */
  static async finalReject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reason } = req.body;
      const clientIp = req.ip || req.socket.remoteAddress;
      const result = await StateService.finalRejectBatch(req.params.id, reason, req.user!, clientIp);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/state/certificates/:id/cancel
   */
  static async cancelCertificate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reason } = req.body;
      const clientIp = req.ip || req.socket.remoteAddress;
      const result = await StateService.cancelCertificate(req.params.id, reason, req.user!, clientIp);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/state/certificates
   */
  static async getCertificates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = req.query;
      const certs = await StateService.getAllCertificates(status as CertificateStatus);
      res.status(200).json({ success: true, count: certs.length, data: certs });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/state/audit-logs
   */
  static async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { batchId, certificateId, action, limit } = req.query;
      const logs = await StateService.getAuditLogs({
        batchId: batchId as string,
        certificateId: certificateId as string,
        action: action as string,
        limit: limit ? parseInt(limit as string, 10) : 100
      });
      res.status(200).json({ success: true, count: logs.length, data: logs });
    } catch (error) {
      next(error);
    }
  }
}
