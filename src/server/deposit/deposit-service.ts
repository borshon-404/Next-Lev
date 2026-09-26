import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessError, NotFoundError, ValidationError } from "@/lib/errors";
import { toNumber } from "@/lib/format";
import { applyLedger, withTransaction } from "../wallet/wallet-service";
import { createNotification } from "../notifications/notification-service";
import { logAudit } from "../audit/audit-service";

/**
 * Admin-managed deposits (offline funding of member wallets).
 * Completing a deposit credits the wallet through the ledger and records a
 * financial Transaction — the same integrity rules as every other flow.
 */

export const createDepositSchema = z.object({
  userId: z.string().min(1, "Choose a member."),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  method: z.string().trim().min(2, "Method is required."),
  reference: z.string().trim().max(80).optional(),
  note: z.string().trim().max(300).optional(),
});

export async function createDeposit(admin: { id: string }, raw: unknown): Promise<string> {
  const parsed = createDepositSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid deposit.");
  }
  const data = parsed.data;
  const user = await prisma.user.findUnique({ where: { id: data.userId }, select: { id: true } });
  if (!user) throw new NotFoundError("Member not found.");

  const deposit = await prisma.deposit.create({
    data: {
      userId: data.userId,
      amount: new Prisma.Decimal(data.amount),
      method: data.method,
      reference: data.reference ?? null,
      note: data.note ?? null,
      status: "PENDING",
    },
  });
  await logAudit(admin.id, {
    action: "DEPOSIT_CREATED",
    targetType: "Deposit",
    targetId: deposit.id,
    newValue: { amount: data.amount, method: data.method },
  });
  return deposit.id;
}

export async function reviewDeposit(
  depositId: string,
  admin: { id: string },
  decision: "COMPLETE" | "CANCEL",
  opts: { note?: string; ip?: string } = {}
): Promise<void> {
  await withTransaction(async (tx) => {
    const deposit = await tx.deposit.findUnique({ where: { id: depositId } });
    if (!deposit) throw new NotFoundError("Deposit not found.");
    if (deposit.status !== "PENDING") {
      throw new BusinessError(`Deposit is already ${deposit.status.toLowerCase()}.`);
    }

    const amount = toNumber(deposit.amount);

    if (decision === "COMPLETE") {
      await applyLedger(tx, deposit.userId, {
        type: "DEPOSIT",
        balanceType: "AVAILABLE",
        amount,
        description: `Deposit via ${deposit.method}${deposit.reference ? ` (${deposit.reference})` : ""}`,
        referenceId: deposit.id,
        idempotencyKey: `deposit:${deposit.id}`,
      });
      await tx.transaction.create({
        data: {
          userId: deposit.userId,
          type: "DEPOSIT",
          amount: new Prisma.Decimal(amount),
          currency: deposit.currency,
          status: "COMPLETED",
          description: `Deposit credited (${deposit.method})`,
          referenceId: deposit.id,
        },
      });
      await createNotification(tx, deposit.userId, {
        type: "ANNOUNCEMENT",
        title: "Deposit credited",
        body: `Your deposit of ${amount.toFixed(2)} ${deposit.currency} has been credited to your wallet.`,
        link: "/wallet",
      });
    }

    await tx.deposit.update({
      where: { id: depositId },
      data: {
        status: decision === "COMPLETE" ? "COMPLETED" : "CANCELLED",
        reviewedById: admin.id,
        reviewNote: opts.note ?? null,
        reviewedAt: new Date(),
      },
    });

    await logAudit(
      admin.id,
      {
        action: `DEPOSIT_${decision}`,
        targetType: "Deposit",
        targetId: depositId,
        previousValue: { status: "PENDING" },
        newValue: { status: decision, note: opts.note ?? null },
        ip: opts.ip,
      },
      tx
    );
  });
}
