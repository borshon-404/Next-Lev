import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { createPurchase, confirmPaymentByAdmin } from "../src/server/payment/payment-service";
import { processCommissionsForTransaction } from "../src/server/commission/commission-service";
import { getMlmSettings } from "../src/server/mlm/settings-service";
import { percentOf, toNumber } from "../src/lib/format";
import { applyLedger } from "../src/server/wallet/wallet-service";

/**
 * Runs a real purchase through the payment pipeline and backdates the whole
 * chain (payment, purchase, transaction, commissions, ledger) so charts show
 * historical growth instead of everything landing "today".
 */
export async function seedPurchase(
  buyerId: string,
  packageId: string,
  days: number,
  adminId: string
): Promise<void> {
  const created = await createPurchase(buyerId, packageId);
  await confirmPaymentByAdmin(created.paymentId, { id: adminId }, { note: "Demo seed" });

  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(10, 24, 0, 0);

  const tx = await prisma.transaction.findFirst({ where: { referenceId: created.paymentId } });
  if (!tx) throw new Error(`Seed: source transaction not found for ${created.paymentId}`);

  await prisma.$transaction([
    prisma.payment.update({ where: { id: created.paymentId }, data: { createdAt: date, updatedAt: date } }),
    prisma.packagePurchase.update({ where: { id: created.purchaseId }, data: { createdAt: date } }),
    prisma.transaction.update({ where: { id: tx.id }, data: { createdAt: date, updatedAt: date } }),
    prisma.commission.updateMany({ where: { sourceTransactionId: tx.id }, data: { createdAt: date, updatedAt: date } }),
    prisma.walletLedger.updateMany({ where: { transactionId: tx.id }, data: { createdAt: date } }),
    prisma.userRank.updateMany({ where: { userId: buyerId }, data: { achievedAt: date } }),
  ]);
}

/**
 * The most recent demo purchase: generated through the same manual path the
 * engine uses, but Alice's level-3 commission is intentionally left PENDING
 * so the admin has live approval work on first login.
 */
export async function manualPurchaseWithPendingCommission(opts: {
  buyerId: string;
  packageId: string;
  days: number;
  adminId: string;
}): Promise<void> {
  const { buyerId, packageId, days, adminId } = opts;
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(14, 8, 0, 0);

  const pkg = await prisma.package.findUniqueOrThrow({ where: { id: packageId } });
  const buyer = await prisma.user.findUniqueOrThrow({ where: { id: buyerId } });
  const settings = await getMlmSettings();

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        userId: buyerId,
        packageId,
        amount: pkg.price,
        currency: pkg.currency,
        gateway: "manual",
        reference: "PAY-SEEDKIM01",
        status: "PAID",
        createdAt: date,
        updatedAt: date,
      },
    });
    const purchase = await tx.packagePurchase.create({
      data: {
        userId: buyerId,
        packageId,
        amount: pkg.price,
        currency: pkg.currency,
        status: "COMPLETED",
        paymentId: payment.id,
        createdAt: date,
      },
    });
    const sourceTx = await tx.transaction.create({
      data: {
        userId: buyerId,
        type: "PACKAGE_PURCHASE",
        amount: pkg.price,
        currency: pkg.currency,
        status: "COMPLETED",
        description: `Package purchase — payment ${payment.reference}`,
        referenceId: payment.id,
        createdAt: date,
      },
    });
    await tx.packagePurchase.update({
      where: { id: purchase.id },
      data: { transactionId: sourceTx.id, commissionsProcessedAt: date },
    });

    // Same upline walk the engine performs (sponsor, sponsor's sponsor, ...).
    const rules = settings.rules.filter((r) => r.active && r.percentage > 0).sort((a, b) => a.level - b.level);
    const upline = await collectUpline(tx, buyer.sponsorId, rules.length ? Math.max(...rules.map((r) => r.level)) : 0);
    const baseAmount = toNumber(pkg.price);

    for (let i = 0; i < upline.length; i++) {
      const level = i + 1;
      const rule = rules.find((r) => r.level === level);
      if (!rule) continue;
      const ancestor = upline[i];
      const amount = percentOf(baseAmount, rule.percentage);
      const isPending = level === 3; // Alice — left pending for the demo queue
      const status = isPending ? "PENDING" : "APPROVED";

      const commission = await tx.commission.create({
        data: {
          beneficiaryId: ancestor.id,
          fromUserId: buyerId,
          sourceTransactionId: sourceTx.id,
          level,
          percentage: new Prisma.Decimal(rule.percentage),
          baseAmount: new Prisma.Decimal(baseAmount),
          amount: new Prisma.Decimal(amount),
          status,
          createdAt: date,
        },
      });
      if (amount > 0) {
        await applyLedger(tx, ancestor.id, {
          type: "COMMISSION",
          balanceType: isPending ? "PENDING" : "AVAILABLE",
          amount,
          description: `Level ${level} commission (${rule.percentage}%) from ${buyer.name}`,
          referenceId: commission.id,
          transactionId: sourceTx.id,
          idempotencyKey: `commission:${commission.id}`,
        });
      }
    }

    // Audit + admin reference for the seed action itself.
    await tx.auditLog.create({
      data: {
        adminId,
        action: "PAYMENT_CONFIRMED",
        targetType: "Payment",
        targetId: payment.id,
        newValue: { status: "PAID", note: "Demo seed (Kim's purchase, Alice's L3 commission left pending)" },
        createdAt: date,
      },
    });
  });

  // Re-run the engine guard path once — must be a no-op (idempotency check).
  const tx = await prisma.transaction.findFirst({ where: { referenceId: "PAY-SEEDKIM01" } });
  if (tx) {
    const rerun = await processCommissionsForTransaction(tx.id);
    if (rerun.processed) throw new Error("Seed: idempotency guard failed — reprocessing happened!");
  }
}

async function collectUpline(
  tx: Prisma.TransactionClient,
  startSponsorId: string | null,
  maxLevels: number
): Promise<{ id: string; name: string }[]> {
  const chain: { id: string; name: string }[] = [];
  let currentId = startSponsorId;
  while (currentId && chain.length < maxLevels) {
    const sponsor = await tx.user.findUnique({ where: { id: currentId }, select: { id: true, name: true, sponsorId: true } });
    if (!sponsor) break;
    chain.push(sponsor);
    currentId = sponsor.sponsorId;
  }
  return chain;
}
