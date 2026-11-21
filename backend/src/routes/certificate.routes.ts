import { Router } from 'express';
import { CertificateController } from '../controllers/certificate.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// ----------------------------------------------------
// PUBLIC / CANDIDATE SECURE ACCESS ENDPOINTS (No Login Required)
// ----------------------------------------------------
// 1. Zero-Authentication Public Verification
router.get('/verify/:identifier', CertificateController.verifyCertificate);

// 2. Candidate Private Access by Unique Signed Token
router.get('/access/:token', CertificateController.getByToken);

// 3. Candidate PDF Download by Unique Token
router.get('/download/:token', CertificateController.downloadPdf);

// ----------------------------------------------------
// AUTHENTICATED MANAGEMENT ENDPOINTS
// ----------------------------------------------------
// Trigger Certificate Generation (Idempotent)
router.post('/generate/:batchId', authenticate, CertificateController.generateBatchCertificates);

// View Simulated WhatsApp Notification Delivery Logs
router.get('/notifications', authenticate, CertificateController.getNotifications);

export default router;
