import { Router, Request, Response } from 'express';
import { SSEManager } from '../utils/sse.manager.js';

const router = Router();

/**
 * GET /api/events/stream
 * Connects a client to the real-time Server-Sent Events stream
 */
router.get('/stream', (req: Request, res: Response) => {
  SSEManager.addClient(res);
});

/**
 * GET /api/events/status
 * Health status of active SSE stream connections
 */
router.get('/status', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    connectedClients: SSEManager.getConnectedCount()
  });
});

export default router;
