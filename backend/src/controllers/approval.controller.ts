import { Request, Response, NextFunction } from 'express';
import { ApprovalService } from '../services/approval.service.js';

export class ApprovalController {
  /**
   * GET /api/approvals/district/dashboard
   */
  static async getDistrictDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ApprovalService.getDistrictDashboard(req.user!);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/approvals/batches/:id/approve
   */
  static async approveByDistrict(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { comments } = req.body;
      const clientIp = req.ip || req.socket.remoteAddress;
      const result = await ApprovalService.approveByDistrictOfficer(req.params.id, comments, req.user!, clientIp);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/approvals/batches/:id/reject
   */
  static async rejectByDistrict(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reason } = req.body;
      const clientIp = req.ip || req.socket.remoteAddress;
      const result = await ApprovalService.rejectByDistrictOfficer(req.params.id, reason, req.user!, clientIp);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/approvals/batches/:id/return
   */
  static async returnForCorrection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reason } = req.body;
      const clientIp = req.ip || req.socket.remoteAddress;
      const result = await ApprovalService.returnForCorrection(req.params.id, reason, req.user!, clientIp);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/approvals/quality/dashboard
   */
  static async getQualityDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ApprovalService.getQualityDashboard(req.user!);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/approvals/quality/:id/approve
   */
  static async approveQuality(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { notes } = req.body;
      const clientIp = req.ip || req.socket.remoteAddress;
      const result = await ApprovalService.approveQualityReview(req.params.id, notes, req.user!, clientIp);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/approvals/quality/:id/reject
   */
  static async rejectQuality(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reason } = req.body;
      const clientIp = req.ip || req.socket.remoteAddress;
      const result = await ApprovalService.rejectQualityReview(req.params.id, reason, req.user!, clientIp);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
