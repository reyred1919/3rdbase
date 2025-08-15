
import { PrismaClient } from '@prisma/client';

// This is a common pattern to prevent creating too many Prisma Client instances in development
// due to Next.js's hot reloading.

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    // Optional: log database queries
    // log: ['query', 'info', 'warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
