import { Router } from 'express';
import { Role } from '@prisma/client';
import { StateController } from '../controllers/state.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Apply State Office Role Guard across all endpoints
router.use(authenticate, requireRole(Role.STATE_OFFICE));

router.get('/dashboard', StateController.getStateDashboard);
router.post('/batches/:id/approve', StateController.finalApprove);
router.post('/batches/:id/reject', StateController.finalReject);
router.post('/certificates/:id/cancel', StateController.cancelCertificate);
router.get('/certificates', StateController.getCertificates);
router.get('/audit-logs', StateController.getAuditLogs);

export default router;
