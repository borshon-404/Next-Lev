import { Prisma, type BalanceType, type LedgerType, type WalletLedger } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BusinessError } from "@/lib/errors";
import { fromCents, toCents, toNumber } from "@/lib/format";

/**
 * Wallet service — the single entry point for ANY wallet balance change.
 *
 * Invariants enforced here:
 *  1. Every balance change creates an immutable WalletLedger row recording
 *     previous and new balance (per balance bucket: AVAILABLE / PENDING).
 *  2. The wallet row is locked (SELECT ... FOR UPDATE) inside the caller's
 *     transaction, so concurrent credits/debits serialize correctly.
 *  3. Balances can never go negative.
 *  4. Optional idempotency keys make operations safe to retry.
 */

export interface LedgerEntryInput {
  type: LedgerType;
  balanceType?: BalanceType;
  /** Signed amount: credits positive, debits negative. */
  amount: number;
  description: string;
  referenceId?: string;
  transactionId?: string;
  idempotencyKey?: string;
  /**
   * Set to false for "move" legs (e.g. pending → available on commission
   * approval) so aggregate counters (totalEarned / totalCommissions) are not
   * double-counted: the earning event was already recorded on the first credit.
   */
  countsTowardEarned?: boolean;
}

/** Row-level lock so concurrent financial operations serialize. */
async function lockWalletRow(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "Wallet" WHERE "userId" = ${userId} FOR UPDATE`;
}

/**
 * Applies one ledger entry inside an existing transaction.
 * NEVER update Wallet balances directly — always go through this function.
 */
export async function applyLedger(
  tx: Prisma.TransactionClient,
  userId: string,
  entry: LedgerEntryInput
): Promise<WalletLedger> {
  const balanceType: BalanceType = entry.balanceType ?? "AVAILABLE";

  await lockWalletRow(tx, userId);

  // Idempotency guard: if this exact entry was already applied, return it.
  if (entry.idempotencyKey) {
    const existing = await tx.walletLedger.findUnique({
      where: { idempotencyKey: entry.idempotencyKey },
    });
    if (existing) return existing;
  }

  const wallet = await tx.wallet.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  const amountCents = toCents(entry.amount);
  const previous =
    balanceType === "AVAILABLE" ? toNumber(wallet.availableBalance) : toNumber(wallet.pendingBalance);
  const next = fromCents(toCents(previous) + amountCents);

  if (next < 0) {
    throw new BusinessError(
      `Insufficient ${balanceType === "AVAILABLE" ? "available" : "pending"} balance for this operation.`
    );
  }

  const ledger = await tx.walletLedger.create({
    data: {
      userId,
      walletId: wallet.id,
      type: entry.type,
      balanceType,
      amount: new Prisma.Decimal(entry.amount),
      previousBalance: new Prisma.Decimal(previous),
      newBalance: new Prisma.Decimal(next),
      description: entry.description,
      referenceId: entry.referenceId ?? null,
      transactionId: entry.transactionId ?? null,
      idempotencyKey: entry.idempotencyKey ?? null,
    },
  });

  // Cached aggregates on the wallet row (derived from the ledger, kept in sync).
  const data: Prisma.WalletUncheckedUpdateInput =
    balanceType === "AVAILABLE" ? { availableBalance: new Prisma.Decimal(next) } : { pendingBalance: new Prisma.Decimal(next) };

  const counts = entry.countsTowardEarned !== false;
  if (entry.type === "COMMISSION" && amountCents > 0 && counts) {
    data.totalCommissions = { increment: new Prisma.Decimal(entry.amount) };
    data.totalEarned = { increment: new Prisma.Decimal(entry.amount) };
  } else if (entry.type === "BONUS" && amountCents > 0 && counts) {
    data.totalEarned = { increment: new Prisma.Decimal(entry.amount) };
  } else if (entry.type === "DEPOSIT" && amountCents > 0) {
    data.totalDeposited = { increment: new Prisma.Decimal(entry.amount) };
  } else if (entry.type === "WITHDRAWAL" && amountCents < 0) {
    data.totalWithdrawn = { increment: new Prisma.Decimal(-entry.amount) };
  }

  await tx.wallet.update({ where: { userId }, data });
  return ledger;
}

/** Convenience wrapper: runs `fn` in a database transaction. */
export function withTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  opts?: { timeout?: number }
): Promise<T> {
  return prisma.$transaction(fn, {
    isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    timeout: opts?.timeout ?? 15_000,
  });
}

/** Ensures a wallet row exists (used at registration). */
export async function ensureWallet(userId: string, tx?: Prisma.TransactionClient): Promise<void> {
  const db = tx ?? prisma;
  await db.wallet.upsert({ where: { userId }, create: { userId }, update: {} });
}
