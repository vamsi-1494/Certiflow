import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import batchRoutes from './routes/batch.routes.js';
import approvalRoutes from './routes/approval.routes.js';
import stateRoutes from './routes/state.routes.js';
import certificateRoutes from './routes/certificate.routes.js';
import eventRoutes from './routes/events.routes.js';
import { authenticate, requireRole } from './middleware/auth.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { Role } from '@prisma/client';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable Cross-Origin Resource Sharing for Frontend
app.use(cors({
  origin: process.env.PUBLIC_FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic Health Check Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    service: 'CertiFlow API',
    mission: 'Pragati Skills Mission',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime())
  });
});

// Authentication Routes
app.use('/api/auth', authRoutes);

// Batch Management Routes
app.use('/api/batches', batchRoutes);

// Approval & Workflow Routes (District Officers & Quality Team)
app.use('/api/approvals', approvalRoutes);

// State Office Routes (Final Approval, Revocation, Audit Logs)
app.use('/api/state', stateRoutes);

// Certificate Generation, Verification & Notification Routes
app.use('/api/certificates', certificateRoutes);

// Real-Time Server-Sent Events (SSE) Stream
app.use('/api/events', eventRoutes);

// Role Authorization Test Endpoints (for automated verification & demonstration)
app.get('/api/test/training-centre-only', authenticate, requireRole(Role.TRAINING_CENTRE), (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'Welcome Anika (Training Centre).' });
});

app.get('/api/test/district-officer-only', authenticate, requireRole(Role.DISTRICT_OFFICER), (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'Welcome District Officer.' });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[CertiFlow] Backend server listening on port ${PORT}`);
  });
}

export default app;
