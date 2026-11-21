import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Public Auth Endpoints
router.post('/login', AuthController.login);
router.post('/demo-login', AuthController.demoLogin);

// Protected Auth Endpoints
router.get('/me', authenticate, AuthController.getMe);
router.post('/logout', authenticate, AuthController.logout);

export default router;
