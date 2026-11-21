import { Router } from 'express';
import multer from 'multer';
import { Role } from '@prisma/client';
import { BatchController } from '../controllers/batch.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Batch Statistics
router.get('/stats', authenticate, BatchController.getStatistics);

// List Batches (Role-Filtered)
router.get('/', authenticate, BatchController.getBatches);

// Create New Batch (Training Centre only)
router.post('/', authenticate, requireRole(Role.TRAINING_CENTRE), BatchController.createBatch);

// Dry-run Spreadsheet Validation (Training Centre only)
router.post('/validate-spreadsheet', authenticate, requireRole(Role.TRAINING_CENTRE), upload.single('file'), BatchController.validateSpreadsheet);

// Get Batch Details
router.get('/:id', authenticate, BatchController.getBatchById);

// Upload Candidates Spreadsheet to Batch (Training Centre only)
router.post('/:id/upload', authenticate, requireRole(Role.TRAINING_CENTRE), upload.single('file'), BatchController.uploadCandidates);

// Submit Batch for Approval (Training Centre only)
router.post('/:id/submit', authenticate, requireRole(Role.TRAINING_CENTRE), BatchController.submitBatch);

// Edit Candidate Information (For correction)
router.put('/:id/candidates/:candidateId', authenticate, requireRole(Role.TRAINING_CENTRE), BatchController.updateCandidate);

// Resubmit Corrected Batch (Training Centre only)
router.post('/:id/resubmit', authenticate, requireRole(Role.TRAINING_CENTRE), BatchController.resubmitBatch);

export default router;
