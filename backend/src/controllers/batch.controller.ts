import { Request, Response, NextFunction } from 'express';
import { BatchService } from '../services/batch.service.js';

export class BatchController {
  /**
   * POST /api/batches
   */
  static async createBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientIp = req.ip || req.socket.remoteAddress;
      const result = await BatchService.createBatch(req.body, req.user!, clientIp);
      res.status(201).json({
        success: true,
        message: 'Batch created successfully in DRAFT status.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/batches/validate-spreadsheet (Dry Run)
   */
  static async validateSpreadsheet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'No spreadsheet file provided. Please attach a CSV or Excel file.' });
        return;
      }

      const result = BatchService.validateSpreadsheet(req.file.buffer);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/batches/:id/upload
   */
  static async uploadCandidates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'No spreadsheet file provided. Please attach a CSV or Excel file.' });
        return;
      }

      const clientIp = req.ip || req.socket.remoteAddress;
      const result = await BatchService.uploadCandidates(req.params.id, req.file.buffer, req.user!, clientIp);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      if (error.code === 'INVALID_SPREADSHEET') {
        res.status(422).json({
          success: false,
          error: 'INVALID_SPREADSHEET',
          message: error.message,
          details: error.details
        });
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/batches
   */
  static async getBatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, search } = req.query;
      const batches = await BatchService.getBatches({ status: status as any, search: search as string }, req.user!);

      res.status(200).json({
        success: true,
        count: batches.length,
        data: batches
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/batches/stats
   */
  static async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await BatchService.getStatistics(req.user!);
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/batches/:id
   */
  static async getBatchById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const batch = await BatchService.getBatchById(req.params.id, req.user!);
      res.status(200).json({
        success: true,
        data: batch
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/batches/:id/submit
   */
  static async submitBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientIp = req.ip || req.socket.remoteAddress;
      const result = await BatchService.submitBatch(req.params.id, req.user!, clientIp);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/batches/:id/candidates/:candidateId
   */
  static async updateCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientIp = req.ip || req.socket.remoteAddress;
      const result = await BatchService.updateCandidate(req.params.id, req.params.candidateId, req.body, req.user!, clientIp);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/batches/:id/resubmit
   */
  static async resubmitBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientIp = req.ip || req.socket.remoteAddress;
      const result = await BatchService.resubmitBatch(req.params.id, req.user!, clientIp);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}
