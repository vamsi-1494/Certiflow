import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { AuthUserPayload } from '../types/auth.types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_pragati_mission_2026';

/**
 * Middleware: Verifies the JWT Bearer token in the Authorization header.
 * Returns 401 Unauthorized if token is missing, expired, or invalid.
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication token missing or invalid format. Please log in.'
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: 'TOKEN_INVALID',
      message: err.name === 'TokenExpiredError' 
        ? 'Session expired. Please log in again.' 
        : 'Invalid authentication token.'
    });
    return;
  }
};

/**
 * Middleware: Role-Based Access Control (RBAC).
 * Ensures that the authenticated user possesses one of the allowed roles.
 * Returns 403 Forbidden if the role is insufficient.
 */
export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required before checking permissions.'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: `Access denied. Role '${req.user.role}' is not authorized for this resource. Required: [${allowedRoles.join(', ')}]`
      });
      return;
    }

    next();
  };
};
