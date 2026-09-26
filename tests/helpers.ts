import { randomUUID } from "crypto";
import { Prisma, type User, type UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Wipe every table (tests run against an isolated DB). */
export async function wipeAll(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "AuditLog", "Notification", "WalletLedger", "Commission", "Kyc",
    "UserRank", "Rank", "Withdrawal", "Deposit", "Payment", "PackagePurchase",
    "Package", "Transaction", "Wallet", "Referral", "Profile", "Session",
    "VerificationToken", "Account", "MlmSettings", "CommissionRule",
    "SystemSetting", "User" RESTART IDENTITY CASCADE;
  `);
}

export async function seedSettings(overrides: Record<string, unknown> = {}): Promise<void> {
  await prisma.mlmSettings.upsert({
    where: { id: "default" },
    update: overrides as Prisma.MlmSettingsUpdateInput,
    create: {
      id: "default",
      commissionEnabled: true,
      commissionAutoApprove: true,
      autoActivate: true,
      kycRequiredForWithdrawal: false,
      minWithdrawal: 10,
      maxWithdrawal: 5000,
      withdrawalFeePercent: 0,
      withdrawalFeeFixed: 0,
      qualification: {
        requireActiveMembership: true,
        requireKyc: false,
        requirePackage: false,
        minDirectReferrals: 0,
        minPersonalVolume: 0,
        minTeamVolume: 0,
        minMonthlySales: 0,
      },
      ...overrides,
    } as Prisma.MlmSettingsCreateInput,
  });
}

export async function seedRules(rules: { level: number; percentage: number; active?: boolean }[]): Promise<void> {
  for (const r of rules) {
    await prisma.commissionRule.create({
      data: { level: r.level, percentage: new Prisma.Decimal(r.percentage), active: r.active ?? true },
    });
  }
}

let userCounter = 0;

export async function makeUser(
  opts: {
    name?: string;
    sponsor?: User | null;
    status?: UserStatus;
    role?: "ADMIN" | "MEMBER";
  } = {}
): Promise<User> {
  userCounter += 1;
  const id = randomUUID();
  const user = await prisma.user.create({
    data: {
      id,
      name: opts.name ?? `Test User ${userCounter}`,
      email: `test${userCounter}@example.test`,
      username: `testuser${userCounter}`,
      passwordHash: "x",
      referralCode: `TESTCODE${userCounter}`,
      role: opts.role ?? "MEMBER",
      status: opts.status ?? "ACTIVE",
      sponsorId: opts.sponsor?.id ?? null,
      depth: opts.sponsor ? opts.sponsor.depth + 1 : 0,
      path: `${opts.sponsor ? opts.sponsor.path : "."}${id}.`,
    },
  });
  await prisma.wallet.create({ data: { userId: user.id } });
  return user;
}

export async function makePackage(price = 100, opts: { commissionEligible?: boolean; pv?: number } = {}): Promise<string> {
  const pkg = await prisma.package.create({
    data: { name: `PKG-${randomUUID().slice(0, 8)}`, price: new Prisma.Decimal(price), pv: new Prisma.Decimal(opts.pv ?? price) },
  });
  if (opts.commissionEligible !== undefined) {
    await prisma.package.update({ where: { id: pkg.id }, data: { commissionEligible: opts.commissionEligible } });
  }
  return pkg.id;
}

/**
 * Creates a fully COMPLETED purchase + its source transaction (the state the
 * commission engine consumes). Mirrors what confirmPaymentByAdmin produces.
 */
export async function completePurchase(
  buyer: User,
  packageId: string,
  amount = 100
): Promise<{ purchaseId: string; transactionId: string; paymentId: string }> {
  const payment = await prisma.payment.create({
    data: { userId: buyer.id, packageId, amount: new Prisma.Decimal(amount), gateway: "manual", reference: `PAY-${randomUUID().slice(0, 8)}`, status: "PAID" },
  });
  const purchase = await prisma.packagePurchase.create({
    data: { userId: buyer.id, packageId, amount: new Prisma.Decimal(amount), status: "PENDING", paymentId: payment.id },
  });
  const transaction = await prisma.transaction.create({
    data: {
      userId: buyer.id,
      type: "PACKAGE_PURCHASE",
      amount: new Prisma.Decimal(amount),
      status: "COMPLETED",
      referenceId: payment.id,
    },
  });
  await prisma.packagePurchase.update({
    where: { id: purchase.id },
    data: { status: "COMPLETED", transactionId: transaction.id },
  });
  return { purchaseId: purchase.id, transactionId: transaction.id, paymentId: payment.id };
}

export async function getWallet(userId: string) {
  const w = await prisma.wallet.findUnique({ where: { userId } });
  return {
    available: Number(w?.availableBalance ?? 0),
    pending: Number(w?.pendingBalance ?? 0),
    totalEarned: Number(w?.totalEarned ?? 0),
    totalCommissions: Number(w?.totalCommissions ?? 0),
    totalWithdrawn: Number(w?.totalWithdrawn ?? 0),
    totalDeposited: Number(w?.totalDeposited ?? 0),
  };
}

export async function getCommissions(beneficiaryId?: string) {
  return prisma.commission.findMany({
    where: beneficiaryId ? { beneficiaryId } : {},
    orderBy: [{ beneficiaryId: "asc" }, { level: "asc" }],
  });
}
