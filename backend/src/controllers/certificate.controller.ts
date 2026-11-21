import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { CertificateService } from '../services/certificate.service.js';
import { MockWhatsAppService } from '../services/whatsapp.service.js';

export class CertificateController {
  /**
   * POST /api/certificates/generate/:batchId
   * Admin / State Office trigger for certificate generation
   */
  static async generateBatchCertificates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CertificateService.generateCertificatesForBatch(req.params.batchId);
      res.status(200).json({
        success: true,
        message: `Successfully processed batch certificates (${result.generatedCount} new credentials created).`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/certificates/verify/:identifier
   * Public zero-authentication verification
   */
  static async verifyCertificate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { identifier } = req.params;
      const result = await CertificateService.verifyCertificate(identifier);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/certificates/access/:token
   * Candidate access via unique secure token
   */
  static async getByToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;
      const cert = await CertificateService.getByAccessToken(token);
      res.status(200).json({
        success: true,
        data: cert
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/certificates/download/:token
   * Streams the PDF certificate file for download
   */
  static async downloadPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;
      const cert = await CertificateService.getByAccessToken(token);

      if (!fs.existsSync(cert.pdfPath)) {
        // If file missing on disk, regenerate on-the-fly
        await CertificateService.generateCertificatesForBatch(cert.batchId);
      }

      if (fs.existsSync(cert.pdfPath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${cert.certificateNumber}.pdf"`);
        const stream = fs.createReadStream(cert.pdfPath);
        stream.pipe(res);
      } else {
        res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Certificate PDF file not found.' });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/certificates/notifications
   * View simulated WhatsApp delivery receipts & retry logs
   */
  static async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { candidateId } = req.query;
      const logs = await MockWhatsAppService.getNotifications(candidateId as string);
      res.status(200).json({
        success: true,
        count: logs.length,
        data: logs
      });
    } catch (error) {
      next(error);
    }
  }
}
