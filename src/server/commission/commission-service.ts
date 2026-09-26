import { Prisma, type Commission, type CommissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BusinessError, NotFoundError } from "@/lib/errors";
import { percentOf, toNumber } from "@/lib/format";
import { applyLedger, withTransaction } from "../wallet/wallet-service";
import { getMlmSettings } from "../mlm/settings-service";
import { evaluateQualification } from "../mlm/qualification-service";
import { createNotification } from "../notifications/notification-service";

/**
 * ============================================================================
 * COMMISSION ENGINE (Unilevel)
 * ============================================================================
 *
 * Triggered by a COMPLETED PACKAGE_PURCHASE transaction. Runs entirely on the
 * server inside ONE database transaction:
 *
 *   1. Validate the source transaction (status + type).
 *   2. Reject reprocessing (purchase.commissionsProcessedAt + DB-level unique
 *      constraint on (sourceTransactionId, beneficiaryId)).
 *   3. Read plan settings + per-level rules FROM THE DATABASE (nothing is
 *      hard-coded — admins configure levels & percentages).
 *   4. Walk the sponsor chain level by level.
 *   5. Skip beneficiaries who are not ACTIVE or fail qualification rules.
 *   6. Create immutable Commission records + wallet ledger entries.
 *   7. Anything that throws rolls the whole transaction back.
 *
 * The engine is plan-agnostic at the boundary: `collectUpline` is the only
 * unilevel-specific step, so Binary/Matrix plans can be added later by
 * supplying a different upline strategy without touching payout logic.
 */

export interface CommissionRunResult {
  processed: boolean;
  reason?: string;
  created: {
    id: string;
    beneficiaryId: string;
    beneficiaryName: string;
    level: number;
    percentage: number;
    amount: number;
    status: CommissionStatus;
  }[];
  skipped: { level: number; userId: string; reason: string }[];
}

interface UplineMember {
  id: string;
  name: string;
  status: string;
}

/** Unilevel strategy: the Nth ancestor is level N. */
async function collectUpline(
  tx: Prisma.TransactionClient,
  startSponsorId: string | null,
  maxLevels: number
): Promise<UplineMember[]> {
  const chain: UplineMember[] = [];
  let currentId = startSponsorId;
  while (currentId && chain.length < maxLevels) {
    const sponsor = await tx.user.findUnique({
      where: { id: currentId },
      select: { id: true, name: true, status: true, sponsorId: true },
    });
    if (!sponsor) break; // broken chain (sponsor deleted) — stop safely
    chain.push({ id: sponsor.id, name: sponsor.name, status: sponsor.status });
    currentId = sponsor.sponsorId;
  }
  return chain;
}

/**
 * Generate commissions for a completed source transaction.
 * Idempotent: safe to call multiple times for the same transaction.
 */
export async function processCommissionsForTransaction(
  sourceTransactionId: string
): Promise<CommissionRunResult> {
  return withTransaction(async (tx) => {
    const result: CommissionRunResult = { processed: false, created: [], skipped: [] };

    // 1. Validate the source transaction -----------------------------------
    const sourceTx = await tx.transaction.findUnique({ where: { id: sourceTransactionId } });
    if (!sourceTx) throw new NotFoundError("Source transaction not found.");
    if (sourceTx.status !== "COMPLETED") {
      return { ...result, reason: "Source transaction is not completed." };
    }
    if (sourceTx.type !== "PACKAGE_PURCHASE") {
      return { ...result, reason: "Transaction type is not commission-eligible." };
    }

    // 2. Reprocessing guards -------------------------------------------------
    const purchase = await tx.packagePurchase.findFirst({
      where: { transactionId: sourceTransactionId },
      include: { package: true, user: { select: { id: true, name: true, status: true, sponsorId: true } } },
    });
    if (!purchase) {
      return { ...result, reason: "No purchase linked to this transaction." };
    }
    if (purchase.commissionsProcessedAt) {
      return { ...result, reason: "Commissions were already processed for this transaction." };
    }

    // 3. Plan settings from the database ------------------------------------
    const settings = await getMlmSettings(tx);
    if (!settings.commissionEnabled) {
      return { ...result, reason: "Commission engine is disabled in MLM settings." };
    }
    if (!purchase.package.commissionEligible) {
      // Mark processed so it is not retried; package opts out of commissions.
      await tx.packagePurchase.update({
        where: { id: purchase.id },
        data: { commissionsProcessedAt: new Date() },
      });
      return { ...result, processed: true, reason: "Package is not commission-eligible." };
    }

    const rules = settings.rules
      .filter((r) => r.active && r.percentage > 0)
      .sort((a, b) => a.level - b.level);
    if (rules.length === 0) {
      await tx.packagePurchase.update({
        where: { id: purchase.id },
        data: { commissionsProcessedAt: new Date() },
      });
      return { ...result, processed: true, reason: "No active commission rules configured." };
    }

    // 4. Walk the upline ------------------------------------------------------
    const maxLevel = Math.max(...rules.map((r) => r.level));
    const upline = await collectUpline(tx, purchase.user.sponsorId, maxLevel);
    if (upline.length === 0) {
      await tx.packagePurchase.update({
        where: { id: purchase.id },
        data: { commissionsProcessedAt: new Date() },
      });
      return { ...result, processed: true, reason: "Buyer has no sponsor (no upline to pay)." };
    }

    const baseAmount = toNumber(purchase.amount);

    // 5–6. Pay each level ----------------------------------------------------
    for (let i = 0; i < upline.length; i++) {
      const level = i + 1;
      const ancestor = upline[i];
      const rule = rules.find((r) => r.level === level);
      if (!rule) continue; // no rule configured for this level

      if (ancestor.status !== "ACTIVE") {
        result.skipped.push({ level, userId: ancestor.id, reason: "Beneficiary is not active." });
        continue;
      }

      const qualification = await evaluateQualification(ancestor.id, settings.qualification, tx);
      if (!qualification.qualified) {
        result.skipped.push({
          level,
          userId: ancestor.id,
          reason: `Not qualified: ${qualification.reasons.join(" ")}`,
        });
        continue;
      }

      const amount = percentOf(baseAmount, rule.percentage);

      let commission: Commission;
      try {
        commission = await tx.commission.create({
          data: {
            beneficiaryId: ancestor.id,
            fromUserId: purchase.user.id,
            sourceTransactionId: sourceTx.id,
            level,
            percentage: new Prisma.Decimal(rule.percentage),
            baseAmount: new Prisma.Decimal(baseAmount),
            amount: new Prisma.Decimal(amount),
            status: settings.commissionAutoApprove ? "APPROVED" : "PENDING",
          },
        });
      } catch (e) {
        // Unique (sourceTransactionId, beneficiaryId) violation = duplicate run.
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          result.skipped.push({ level, userId: ancestor.id, reason: "Duplicate commission prevented." });
          continue;
        }
        throw e;
      }

      if (amount > 0) {
        await applyLedger(tx, ancestor.id, {
          type: "COMMISSION",
          balanceType: settings.commissionAutoApprove ? "AVAILABLE" : "PENDING",
          amount,
          description: `Level ${level} commission (${rule.percentage}%) from ${purchase.user.name}`,
          referenceId: commission.id,
          transactionId: sourceTx.id,
          idempotencyKey: `commission:${commission.id}`,
        });
      }

      await createNotification(tx, ancestor.id, {
        type: "COMMISSION_RECEIVED",
        title: `Level ${level} commission received`,
        body: `You earned ${amount.toFixed(2)} ${settings.currency} from ${purchase.user.name}'s purchase.`,
        link: "/commissions",
      });

      result.created.push({
        id: commission.id,
        beneficiaryId: ancestor.id,
        beneficiaryName: ancestor.name,
        level,
        percentage: rule.percentage,
        amount,
        status: settings.commissionAutoApprove ? "APPROVED" : "PENDING",
      });
    }

    // 7. Mark processed inside the same transaction ---------------------------
    await tx.packagePurchase.update({
      where: { id: purchase.id },
      data: { commissionsProcessedAt: new Date() },
    });
    result.processed = true;
    return result;
  });
}

// ---------------------------------------------------------------------------
// Commission lifecycle (admin operations)
// ---------------------------------------------------------------------------

/** PENDING → APPROVED: moves funds from pending bucket to available bucket. */
export async function approveCommission(commissionId: string): Promise<void> {
  await withTransaction(async (tx) => {
    const commission = await tx.commission.findUnique({ where: { id: commissionId } });
    if (!commission) throw new NotFoundError("Commission not found.");
    if (commission.status !== "PENDING") {
      throw new BusinessError(`Only PENDING commissions can be approved (current: ${commission.status}).`);
    }
    const amount = toNumber(commission.amount);
    if (amount > 0) {
      await applyLedger(tx, commission.beneficiaryId, {
        type: "COMMISSION",
        balanceType: "PENDING",
        amount: -amount,
        description: "Commission approved — released from pending",
        referenceId: commission.id,
        idempotencyKey: `commission-approve-out:${commission.id}`,
      });
      await applyLedger(tx, commission.beneficiaryId, {
        type: "COMMISSION",
        balanceType: "AVAILABLE",
        amount,
        description: "Commission approved — credited to available balance",
        referenceId: commission.id,
        idempotencyKey: `commission-approve-in:${commission.id}`,
        countsTowardEarned: false, // move, not a new earning
      });
    }
    await tx.commission.update({
      where: { id: commissionId },
      data: { status: "APPROVED" },
    });
  });
}

/** PENDING → CANCELLED: removes the pending credit. */
export async function cancelCommission(commissionId: string, reason?: string): Promise<void> {
  await withTransaction(async (tx) => {
    const commission = await tx.commission.findUnique({ where: { id: commissionId } });
    if (!commission) throw new NotFoundError("Commission not found.");
    if (commission.status !== "PENDING") {
      throw new BusinessError(`Only PENDING commissions can be cancelled (current: ${commission.status}).`);
    }
    const amount = toNumber(commission.amount);
    if (amount > 0) {
      await applyLedger(tx, commission.beneficiaryId, {
        type: "REVERSAL",
        balanceType: "PENDING",
        amount: -amount,
        description: `Commission cancelled${reason ? `: ${reason}` : ""}`,
        referenceId: commission.id,
        idempotencyKey: `commission-cancel:${commission.id}`,
      });
    }
    await tx.commission.update({
      where: { id: commissionId },
      data: { status: "CANCELLED", note: reason ?? null, reversedAt: new Date() },
    });
  });
}

/** APPROVED → PAID (bookkeeping: funds already in available balance). */
export async function markCommissionPaid(commissionId: string): Promise<void> {
  const commission = await prisma.commission.findUnique({ where: { id: commissionId } });
  if (!commission) throw new NotFoundError("Commission not found.");
  if (commission.status !== "APPROVED") {
    throw new BusinessError(`Only APPROVED commissions can be marked paid (current: ${commission.status}).`);
  }
  await prisma.commission.update({
    where: { id: commissionId },
    data: { status: "PAID", paidAt: new Date() },
  });
}

/**
 * Reverse every PENDING/APPROVED commission generated by a source
 * transaction (e.g. the purchase was refunded). Atomic: if any beneficiary's
 * balance cannot cover the reversal, the whole operation rolls back.
 */
export async function reverseCommissionsForTransaction(
  sourceTransactionId: string,
  reason: string
): Promise<number> {
  return withTransaction(async (tx) => {
    const commissions = await tx.commission.findMany({
      where: { sourceTransactionId, status: { in: ["PENDING", "APPROVED"] } },
    });
    for (const commission of commissions) {
      const amount = toNumber(commission.amount);
      if (amount > 0) {
        await applyLedger(tx, commission.beneficiaryId, {
          type: "REVERSAL",
          balanceType: commission.status === "PENDING" ? "PENDING" : "AVAILABLE",
          amount: -amount,
          description: `Commission reversed: ${reason}`,
          referenceId: commission.id,
          idempotencyKey: `commission-reverse:${commission.id}`,
        });
      }
      await tx.commission.update({
        where: { id: commission.id },
        data: { status: "REVERSED", note: reason, reversedAt: new Date() },
      });
    }
    return commissions.length;
  });
}
