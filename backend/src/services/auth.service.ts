import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import prisma, { isDbConnected } from '../utils/prisma.js';
import { AuditService } from './audit.service.js';
import { AuthUserPayload } from '../types/auth.types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_pragati_mission_2026';

// Predefined demo personas for easy evaluation
export const DEMO_PERSONAS: Record<string, { email: string; defaultRole: Role; name: string; districtId?: string; trainingCentreId?: string }> = {
  anika: { email: 'anika@pragati.gov.in', defaultRole: Role.TRAINING_CENTRE, name: 'Anika Sharma', districtId: 'bhopal-dist-id', trainingCentreId: 'tc-bpl-001' },
  dev: { email: 'dev@pragati.gov.in', defaultRole: Role.DISTRICT_OFFICER, name: 'Dev Verma', districtId: 'bhopal-dist-id' },
  meera: { email: 'meera@pragati.gov.in', defaultRole: Role.DISTRICT_OFFICER, name: 'Meera Rao', districtId: 'bhopal-dist-id' },
  kabir: { email: 'kabir@pragati.gov.in', defaultRole: Role.DISTRICT_OFFICER, name: 'Kabir Singh', districtId: 'bhopal-dist-id' },
  neha: { email: 'neha@pragati.gov.in', defaultRole: Role.QUALITY_TEAM, name: 'Neha Gupta' },
  farah: { email: 'farah@pragati.gov.in', defaultRole: Role.STATE_OFFICE, name: 'Farah Khan' }
};

export class AuthService {
  public static generateToken(payload: AuthUserPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  }

  static async login(email: string, password: string, ipAddress?: string) {
    if (!email || !password) {
      const err: any = new Error('Email and password are required.');
      err.statusCode = 400;
      throw err;
    }

    const cleanEmail = email.toLowerCase().trim();
    const matchingPersona = Object.values(DEMO_PERSONAS).find(p => p.email === cleanEmail);

    let user: any = null;
    if (isDbConnected()) {
      try {
        user = await prisma.user.findUnique({
          where: { email: cleanEmail },
          include: {
            district: { select: { id: true, name: true, code: true } },
            trainingCentre: { select: { id: true, name: true, centreCode: true } }
          }
        });
      } catch (dbErr) {
        // Fallback
      }
    }

    if (!user && matchingPersona && password === 'Password@123') {
      const payload: AuthUserPayload = {
        userId: `user-${matchingPersona.email.split('@')[0]}`,
        email: matchingPersona.email,
        name: matchingPersona.name,
        role: matchingPersona.defaultRole,
        districtId: matchingPersona.districtId,
        trainingCentreId: matchingPersona.trainingCentreId
      };
      return {
        token: this.generateToken(payload),
        user: payload
      };
    }

    if (!user) {
      const err: any = new Error('Invalid email or password.');
      err.statusCode = 401;
      throw err;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const err: any = new Error('Invalid email or password.');
      err.statusCode = 401;
      throw err;
    }

    const payload: AuthUserPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      districtId: user.districtId,
      trainingCentreId: user.trainingCentreId
    };

    const token = this.generateToken(payload);

    await AuditService.record({
      userId: user.id,
      role: user.role,
      action: 'USER_LOGIN',
      ipAddress,
      metadata: { method: 'STANDARD_CREDENTIALS', email: user.email }
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        district: user.district,
        trainingCentre: user.trainingCentre
      }
    };
  }

  static async demoLogin(personaKey: string, ipAddress?: string) {
    const key = personaKey.toLowerCase().trim();
    const persona = DEMO_PERSONAS[key];

    if (!persona) {
      const err: any = new Error(`Unknown persona '${personaKey}'. Valid personas: Anika, Dev, Meera, Kabir, Neha, Farah`);
      err.statusCode = 400;
      throw err;
    }

    let user: any = null;
    if (isDbConnected()) {
      try {
        user = await prisma.user.findUnique({
          where: { email: persona.email },
          include: {
            district: { select: { id: true, name: true, code: true } },
            trainingCentre: { select: { id: true, name: true, centreCode: true } }
          }
        });
      } catch (dbErr) {
        // Fallback
      }
    }

    const payload: AuthUserPayload = {
      userId: user ? user.id : `demo-${key}`,
      email: persona.email,
      name: persona.name,
      role: persona.defaultRole,
      districtId: user?.districtId || persona.districtId || null,
      trainingCentreId: user?.trainingCentreId || persona.trainingCentreId || null
    };

    const token = this.generateToken(payload);

    if (user) {
      await AuditService.record({
        userId: user.id,
        role: user.role,
        action: 'DEMO_LOGIN',
        ipAddress,
        metadata: { persona: personaKey }
      });
    }

    return {
      token,
      user: {
        id: payload.userId,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        district: user?.district || null,
        trainingCentre: user?.trainingCentre || null
      }
    };
  }

  static async getMe(userId: string) {
    let user: any = null;
    if (isDbConnected()) {
      try {
        user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            phone: true,
            district: { select: { id: true, name: true, code: true, state: true } },
            trainingCentre: { select: { id: true, name: true, centreCode: true, address: true } },
            createdAt: true
          }
        });
      } catch (dbErr) {
        // Fallback
      }
    }

    if (!user) {
      const personaKey = userId.replace('demo-', '').replace('user-', '');
      const persona = DEMO_PERSONAS[personaKey];
      if (persona) {
        return {
          id: userId,
          email: persona.email,
          name: persona.name,
          role: persona.defaultRole,
          phone: '+91 98765 00000',
          district: persona.districtId ? { id: persona.districtId, name: 'Bhopal', code: 'BPL', state: 'Madhya Pradesh' } : null,
          trainingCentre: persona.trainingCentreId ? { id: persona.trainingCentreId, name: 'Apex Skill Development Centre', centreCode: 'TC-BPL-001', address: 'Bhopal' } : null,
          createdAt: new Date()
        };
      }

      const err: any = new Error('User account not found.');
      err.statusCode = 404;
      throw err;
    }

    return user;
  }
}
