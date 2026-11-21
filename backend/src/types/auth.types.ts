import { Role } from '@prisma/client';

export interface AuthUserPayload {
  userId: string;
  email: string;
  name: string;
  role: Role;
  districtId?: string | null;
  trainingCentreId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}
