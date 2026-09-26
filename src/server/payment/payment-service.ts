import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BusinessError, NotFoundError } from "@/lib/errors";
import { generateReference } from "@/lib/ids";
import { toNumber } from "@/lib/format";
import { withTransaction } from "../wallet/wallet-service";
import { createNotification } from "../notifications/notification-service";
import { processCommissionsForTransaction } from "../commission/commission-service";
import { evaluateUserRank } from "../rank/rank-service";
import { logAudit } from "../audit/audit-service";
import { getSystemSetting } from "../settings/system-settings";

/**
 * Payment abstraction layer.
 *
 * The core MLM engine never talks to a gateway directly — it only knows the
 * Payment record lifecycle (PENDING → PAID/FAILED/CANCELLED/REFUNDED).
 * Gateways plug in by implementing PaymentProvider; nothing else changes.
 *
 * IMPORTANT: no provider ever fabricates success. The built-in "manual"
 * provider requires an admin to verify funds before a payment is marked PAID.
 */

export interface PaymentIntentInput {
  userId: string;
  amount: number;
  currency: string;
  reference: string;
  packageId?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentIntentResult {
  gatewayReference?: string;
  redirectUrl?: string;
  instructions?: string;
}

export interface PaymentProvider {
  readonly id: string;
  readonly label: string;
  createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>;
}

/** Manual / offline payments (bank transfer, bKash, Nagad...). */
class ManualProvider implements PaymentProvider {
  readonly id = "manual";
  readonly label = "Manual / Bank Transfer";

  async createIntent(): Promise<PaymentIntentResult> {
    const instructions =
      (await getSystemSetting<string>("payment_instructions")) ??
      "Send your payment to the account details shown on the invoice, then wait for an administrator to verify and confirm your payment. Your package activates automatically once the payment is confirmed.";
    return { instructions };
  }
}

/**
 * Stripe placeholder — demonstrates the provider contract. Until real keys are
 * configured it fails loudly instead of pretending a payment succeeded.
 */
class StripeProvider implements PaymentProvider {
  readonly id = "stripe";
  readonly label = "Stripe (not connected)";

  async createIntent(): Promise<PaymentIntentResult> {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new BusinessError(
        "Stripe is not configured on this deployment. Choose another payment method or contact support."
      );
    }
    throw new BusinessError("Stripe integration is not connected yet. Use manual payment for now.");
  }
}

const providers: Record<string, PaymentProvider> = {
  manual: new ManualProvider(),
  stripe: new StripeProvider(),
};

export function getPaymentProvider(gateway: string): PaymentProvider {
  const provider = providers[gateway];
  if (!provider) throw new BusinessError(`Unknown payment gateway: ${gateway}`);
  return provider;
}

export function listPaymentGateways(): { id: string; label: string }[] {
  return Object.values(providers).map((p) => ({ id: p.id, label: p.label }));
}

// ---------------------------------------------------------------------------
// Purchase flow
// ---------------------------------------------------------------------------

export interface CreatePurchaseResult {
  paymentId: string;
  purchaseId: string;
  reference: string;
  amount: number;
  currency: string;
  instructions?: string;
  redirectUrl?: string;
}

/** Member starts a package purchase: creates Payment + Purchase as PENDING. */
export async function createPurchase(
  userId: string,
  packageId: string,
  gateway = "manual"
): Promise<CreatePurchaseResult> {
  const [user, pkg] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { status: true } }),
    prisma.package.findUnique({ where: { id: packageId } }),
  ]);
  if (!user || user.status !== "ACTIVE") {
    throw new BusinessError("Your account is not active.");
  }
  if (!pkg || !pkg.isActive) {
    throw new NotFoundError("This package is not available.");
  }

  const provider = getPaymentProvider(gateway);
  const reference = generateReference("PAY");
  const amount = toNumber(pkg.price);
  const currency = pkg.currency;

  const intent = await provider.createIntent({ userId, amount, currency, reference, packageId });

  const created = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        userId,
        packageId,
        amount: new Prisma.Decimal(amount),
        currency,
        gateway,
        reference,
        status: "PENDING",
        metadata: (intent.gatewayReference ? { gatewayReference: intent.gatewayReference } : {}) as Prisma.InputJsonValue,
      },
    });
    const purchase = await tx.packagePurchase.create({
      data: {
        userId,
        packageId,
        amount: new Prisma.Decimal(amount),
        currency,
        status: "PENDING",
        paymentId: payment.id,
      },
    });
    return { paymentId: payment.id, purchaseId: purchase.id };
  });

  return {
    ...created,
    reference,
    amount,
    currency,
    instructions: intent.instructions,
    redirectUrl: intent.redirectUrl,
  };
}

/**
 * Admin confirms funds were received: Payment → PAID, Purchase → COMPLETED,
 * creates the source Transaction, then runs the commission engine and rank
 * evaluation. No fake confirmations: only a verified admin action.
 */
export async function confirmPaymentByAdmin(
  paymentId: string,
  admin: { id: string },
  opts: { note?: string; ip?: string } = {}
): Promise<void> {
  const transactionId = await withTransaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { purchase: true, user: { select: { id: true, name: true } } },
    });
    if (!payment) throw new NotFoundError("Payment not found.");
    if (payment.status !== "PENDING") {
      throw new BusinessError(`Payment is already ${payment.status.toLowerCase()}.`);
    }
    if (!payment.purchase) throw new BusinessError("Payment has no linked purchase.");

    await tx.payment.update({
      where: { id: paymentId },
      data: { status: "PAID", metadata: { confirmedBy: admin.id, note: opts.note ?? null } as Prisma.InputJsonValue },
    });

    const transaction = await tx.transaction.create({
      data: {
        userId: payment.userId,
        type: "PACKAGE_PURCHASE",
        amount: payment.amount,
        currency: payment.currency,
        status: "COMPLETED",
        description: `Package purchase — payment ${payment.reference}`,
        referenceId: payment.id,
      },
    });

    await tx.packagePurchase.update({
      where: { id: payment.purchase.id },
      data: { status: "COMPLETED", transactionId: transaction.id },
    });

    await createNotification(tx, payment.userId, {
      type: "PACKAGE_PURCHASED",
      title: "Payment confirmed",
      body: `Your payment of ${toNumber(payment.amount).toFixed(2)} ${payment.currency} was confirmed. Your package is now active.`,
      link: "/purchases",
    });

    await logAudit(
      admin.id,
      {
        action: "PAYMENT_CONFIRMED",
        targetType: "Payment",
        targetId: paymentId,
        previousValue: { status: "PENDING" },
        newValue: { status: "PAID", note: opts.note ?? null },
        ip: opts.ip,
      },
      tx
    );

    return transaction.id;
  });

  // Post-commit side effects (idempotent, safe to retry independently).
  const buyer = await prisma.payment.findUnique({ where: { id: paymentId }, select: { userId: true } });
  await processCommissionsForTransaction(transactionId);
  if (buyer) await evaluateUserRank(buyer.userId);
}

export async function failPaymentByAdmin(
  paymentId: string,
  admin: { id: string },
  reason: string,
  opts: { ip?: string } = {}
): Promise<void> {
  await withTransaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { purchase: true } });
    if (!payment) throw new NotFoundError("Payment not found.");
    if (payment.status !== "PENDING") {
      throw new BusinessError(`Payment is already ${payment.status.toLowerCase()}.`);
    }
    await tx.payment.update({ where: { id: paymentId }, data: { status: "FAILED", failureReason: reason } });
    if (payment.purchase) {
      await tx.packagePurchase.update({ where: { id: payment.purchase.id }, data: { status: "CANCELLED" } });
    }
    await logAudit(
      admin.id,
      {
        action: "PAYMENT_FAILED",
        targetType: "Payment",
        targetId: paymentId,
        previousValue: { status: "PENDING" },
        newValue: { status: "FAILED", reason },
        ip: opts.ip,
      },
      tx
    );
  });
}

/** Member cancels their own pending purchase. */
export async function cancelPurchaseByMember(purchaseId: string, userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const purchase = await tx.packagePurchase.findUnique({ where: { id: purchaseId }, include: { payment: true } });
    if (!purchase || purchase.userId !== userId) throw new NotFoundError("Purchase not found.");
    if (purchase.status !== "PENDING") throw new BusinessError("Only pending purchases can be cancelled.");
    await tx.packagePurchase.update({ where: { id: purchaseId }, data: { status: "CANCELLED" } });
    if (purchase.payment && purchase.payment.status === "PENDING") {
      await tx.payment.update({ where: { id: purchase.payment.id }, data: { status: "CANCELLED" } });
    }
  });
}
