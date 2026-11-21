import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { AuditService } from '../services/audit.service.js';

export class AuthController {
  /**
   * POST /api/auth/login
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const clientIp = req.ip || req.socket.remoteAddress;

      const result = await AuthService.login(email, password, clientIp);

      res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/demo-login
   * Quick persona login for hackathon evaluation
   */
  static async demoLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { persona } = req.body;
      const clientIp = req.ip || req.socket.remoteAddress;

      if (!persona) {
        res.status(400).json({
          success: false,
          error: 'BAD_REQUEST',
          message: 'Persona name is required (e.g. anika, dev, meera, kabir, neha, farah).'
        });
        return;
      }

      const result = await AuthService.demoLogin(persona, clientIp);

      res.status(200).json({
        success: true,
        message: `Logged in as persona: ${persona}`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   */
  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Not authenticated.' });
        return;
      }

      const user = await AuthService.getMe(req.user.userId);

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   */
  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user) {
        await AuditService.record({
          userId: req.user.userId,
          role: req.user.role,
          action: 'USER_LOGOUT',
          ipAddress: req.ip || req.socket.remoteAddress
        });
      }

      res.status(200).json({
        success: true,
        message: 'Logged out successfully.'
      });
    } catch (error) {
      next(error);
    }
  }
}
