import { Router } from 'express';
import { Role } from '@prisma/client';
import { ApprovalController } from '../controllers/approval.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// ----------------------------------------------------
// DISTRICT OFFICER WORKFLOW ENDPOINTS (Dev, Meera, Kabir)
// ----------------------------------------------------
router.get('/district/dashboard', authenticate, requireRole(Role.DISTRICT_OFFICER), ApprovalController.getDistrictDashboard);
router.post('/batches/:id/approve', authenticate, requireRole(Role.DISTRICT_OFFICER), ApprovalController.approveByDistrict);
router.post('/batches/:id/reject', authenticate, requireRole(Role.DISTRICT_OFFICER), ApprovalController.rejectByDistrict);
router.post('/batches/:id/return', authenticate, requireRole(Role.DISTRICT_OFFICER), ApprovalController.returnForCorrection);

// ----------------------------------------------------
// QUALITY ASSURANCE WORKFLOW ENDPOINTS (Neha)
// ----------------------------------------------------
router.get('/quality/dashboard', authenticate, requireRole(Role.QUALITY_TEAM), ApprovalController.getQualityDashboard);
router.post('/quality/:id/approve', authenticate, requireRole(Role.QUALITY_TEAM), ApprovalController.approveQuality);
router.post('/quality/:id/reject', authenticate, requireRole(Role.QUALITY_TEAM), ApprovalController.rejectQuality);

export default router;
