import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton. In development the client is cached on globalThis
 * to survive Next.js hot reloads (avoids exhausting the connection pool).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type { Prisma } from "@prisma/client";
export { Prisma as PrismaNamespace } from "@prisma/client";
