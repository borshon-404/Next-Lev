import { Prisma, type WithdrawalStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessError, NotFoundError, ValidationError } from "@/lib/errors";
import { toNumber } from "@/lib/format";
import { applyLedger, withTransaction } from "../wallet/wallet-service";
import { getMlmSettings } from "../mlm/settings-service";
import { createNotification } from "../notifications/notification-service";
import { logAudit } from "../audit/audit-service";

/**
 * Withdrawal flow (all limits/fees read from MlmSettings):
 *
 *   request  → funds are HELD immediately (wallet debit inside a DB
 *              transaction, so a member can never request more than their
 *              available balance — enforced under a row lock)
 *   approve  → PENDING → APPROVED (funds stay held)
 *   complete → creates the financial Transaction record + ledger trail
 *   reject / cancel → funds are REFUNDED to the available balance
 */

export const requestWithdrawalSchema = z.object({
  amount: z.coerce.number().positive("Enter an amount greater than zero."),
  paymentMethod: z.string().trim().min(1, "Choose a payment method."),
  accountDetails: z.string().trim().min(3, "Enter your account details.").max(200),
  note: z.string().trim().max(300).optional(),
});

export interface WithdrawalRequestResult {
  id: string;
  amount: number;
  fee: number;
  netAmount: number;
}

export async function requestWithdrawal(
  userId: string,
  rawInput: unknown
): Promise<WithdrawalRequestResult> {
  const parsed = requestWithdrawalSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues[0]?.message ?? "Invalid withdrawal request.",
      Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? "form"), [i.message]]))
    );
  }
  const { amount, paymentMethod, accountDetails, note } = parsed.data;
  const settings = await getMlmSettings();

  if (amount < settings.minWithdrawalNum) {
    throw new ValidationError(`Minimum withdrawal amount is ${settings.minWithdrawalNum.toFixed(2)} ${settings.currency}.`);
  }
  if (amount > settings.maxWithdrawalNum) {
    throw new ValidationError(`Maximum withdrawal amount is ${settings.maxWithdrawalNum.toFixed(2)} ${settings.currency}.`);
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
  if (!user || user.status !== "ACTIVE") {
    throw new BusinessError("Your account is not active. Withdrawals are unavailable.");
  }

  if (settings.kycRequiredForWithdrawal) {
    const kyc = await prisma.kyc.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { status: true },
    });
    if (kyc?.status !== "APPROVED") {
      throw new BusinessError("KYC verification is required before withdrawing. Please complete KYC first.");
    }
  }

  // Fee is part of the requested amount: net payout = amount − fee.
  const feeRaw = (amount * settings.withdrawalFeePercentNum) / 100 + settings.withdrawalFeeFixedNum;
  const fee = Math.round(feeRaw * 100) / 100;
  const netAmount = Math.round((amount - fee) * 100) / 100;
  if (netAmount <= 0) {
    throw new ValidationError("The withdrawal fee exceeds the requested amount.");
  }

  return withTransaction(async (tx) => {
    const withdrawal = await tx.withdrawal.create({
      data: {
        userId,
        amount: new Prisma.Decimal(amount),
        fee: new Prisma.Decimal(fee),
        netAmount: new Prisma.Decimal(netAmount),
        currency: settings.currency,
        paymentMethod,
        accountDetails,
        note: note ?? null,
        status: "PENDING",
      },
    });

    // Hold the funds — throws (and rolls back) if the balance is insufficient.
    await applyLedger(tx, userId, {
      type: "WITHDRAWAL",
      balanceType: "AVAILABLE",
      amount: -amount,
      description: `Withdrawal request held (${paymentMethod})`,
      referenceId: withdrawal.id,
      idempotencyKey: `withdrawal-hold:${withdrawal.id}`,
    });

    await createNotification(tx, userId, {
      type: "WITHDRAWAL_SUBMITTED",
      title: "Withdrawal requested",
      body: `Your withdrawal of ${amount.toFixed(2)} ${settings.currency} is pending review.`,
      link: "/withdrawals",
    });

    return { id: withdrawal.id, amount, fee, netAmount };
  });
}

export async function cancelWithdrawal(withdrawalId: string, userId: string): Promise<void> {
  await withTransaction(async (tx) => {
    const w = await tx.withdrawal.findUnique({ where: { id: withdrawalId } });
    if (!w) throw new NotFoundError("Withdrawal not found.");
    if (w.userId !== userId) throw new BusinessError("This withdrawal does not belong to you.");
    if (w.status !== "PENDING") {
      throw new BusinessError("Only pending withdrawals can be cancelled.");
    }
    await refundWithdrawal(tx, w.id, w.userId, toNumber(w.amount), "Withdrawal cancelled by member");
    await tx.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: "CANCELLED", reviewNote: "Cancelled by member" },
    });
  });
}

async function refundWithdrawal(
  tx: Prisma.TransactionClient,
  withdrawalId: string,
  userId: string,
  amount: number,
  reason: string
): Promise<void> {
  if (amount > 0) {
    await applyLedger(tx, userId, {
      type: "REFUND",
      balanceType: "AVAILABLE",
      amount,
      description: reason,
      referenceId: withdrawalId,
      idempotencyKey: `withdrawal-refund:${withdrawalId}`,
    });
  }
}

type AdminWithdrawalAction = "APPROVE" | "REJECT" | "COMPLETE" | "MARK_PROCESSING";

const transitions: Record<AdminWithdrawalAction, { from: WithdrawalStatus[]; to: WithdrawalStatus }> = {
  APPROVE: { from: ["PENDING"], to: "APPROVED" },
  MARK_PROCESSING: { from: ["APPROVED"], to: "PROCESSING" },
  COMPLETE: { from: ["APPROVED", "PROCESSING"], to: "COMPLETED" },
  REJECT: { from: ["PENDING", "APPROVED"], to: "REJECTED" },
};

export async function adminReviewWithdrawal(
  withdrawalId: string,
  admin: { id: string },
  action: AdminWithdrawalAction,
  opts: { note?: string; ip?: string } = {}
): Promise<void> {
  const transition = transitions[action];

  await withTransaction(async (tx) => {
    const w = await tx.withdrawal.findUnique({ where: { id: withdrawalId }, include: { user: { select: { name: true, email: true } } } });
    if (!w) throw new NotFoundError("Withdrawal not found.");
    if (!transition.from.includes(w.status)) {
      throw new BusinessError(`Cannot ${action.toLowerCase()} a withdrawal with status ${w.status}.`);
    }

    const amount = toNumber(w.amount);

    if (action === "REJECT") {
      await refundWithdrawal(tx, w.id, w.userId, amount, `Withdrawal rejected${opts.note ? `: ${opts.note}` : ""}`);
      await createNotification(tx, w.userId, {
        type: "WITHDRAWAL_REJECTED",
        title: "Withdrawal rejected",
        body: opts.note
          ? `Your withdrawal of ${amount.toFixed(2)} was rejected. Reason: ${opts.note}. The amount has been refunded to your wallet.`
          : `Your withdrawal of ${amount.toFixed(2)} was rejected. The amount has been refunded to your wallet.`,
        link: "/withdrawals",
      });
    }

    if (action === "COMPLETE") {
      // The external money movement is finalized: record the financial
      // transaction + processing timestamp (the wallet debit already happened
      // at request time and remains fully auditable in the ledger).
      await tx.transaction.create({
        data: {
          userId: w.userId,
          type: "WITHDRAWAL",
          amount: new Prisma.Decimal(amount),
          currency: w.currency,
          status: "COMPLETED",
          description: `Withdrawal completed via ${w.paymentMethod} (net ${toNumber(w.netAmount).toFixed(2)}, fee ${toNumber(w.fee).toFixed(2)})`,
          referenceId: w.id,
        },
      });
      await createNotification(tx, w.userId, {
        type: "WITHDRAWAL_APPROVED",
        title: "Withdrawal completed",
        body: `Your withdrawal of ${toNumber(w.netAmount).toFixed(2)} ${w.currency} has been sent to your ${w.paymentMethod} account.`,
        link: "/withdrawals",
      });
    }

    if (action === "APPROVE") {
      await createNotification(tx, w.userId, {
        type: "WITHDRAWAL_APPROVED",
        title: "Withdrawal approved",
        body: `Your withdrawal of ${amount.toFixed(2)} ${w.currency} was approved and is being processed.`,
        link: "/withdrawals",
      });
    }

    const previous = { status: w.status };
    await tx.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: transition.to,
        reviewedById: admin.id,
        reviewNote: opts.note ?? null,
        reviewedAt: new Date(),
        ...(transition.to === "COMPLETED" ? { completedAt: new Date() } : {}),
      },
    });

    await logAudit(admin.id, {
      action: `WITHDRAWAL_${action}`,
      targetType: "Withdrawal",
      targetId: withdrawalId,
      previousValue: previous,
      newValue: { status: transition.to, note: opts.note ?? null },
      ip: opts.ip,
    }, tx);
  });
}
