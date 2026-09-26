import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Audit logging for sensitive admin operations.
 * Audit rows are write-once: no update/delete paths exist in the admin UI.
 */

export interface AuditInput {
  action: string;
  targetType?: string;
  targetId?: string;
  previousValue?: unknown;
  newValue?: unknown;
  ip?: string;
}

export async function logAudit(
  adminId: string,
  input: AuditInput,
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<void> {
  await db.auditLog.create({
    data: {
      adminId,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      previousValue:
        input.previousValue === undefined
          ? Prisma.DbNull
          : (input.previousValue as Prisma.InputJsonValue),
      newValue:
        input.newValue === undefined ? Prisma.DbNull : (input.newValue as Prisma.InputJsonValue),
      ip: input.ip ?? null,
    },
  });
}
