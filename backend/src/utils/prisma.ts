import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
  var isDatabaseConnected: boolean | undefined;
}

export const prisma = globalThis.prisma || new PrismaClient({
  log: []
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// Default to false until active connection is verified
globalThis.isDatabaseConnected = false;

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('DB timeout')), 400)
    );
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeoutPromise]);
    globalThis.isDatabaseConnected = true;
    console.log('[CertiFlow] Connected to PostgreSQL database at localhost:5432.');
    return true;
  } catch (err) {
    globalThis.isDatabaseConnected = false;
    console.log('[CertiFlow] Standalone Mode: Native PostgreSQL offline. In-memory transactional store active.');
    return false;
  }
}

export function isDbConnected(): boolean {
  return globalThis.isDatabaseConnected === true;
}

// Fast connection probe on startup
checkDatabaseConnection().catch(() => {});

export default prisma;
