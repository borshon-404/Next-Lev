import { Prisma, type UserStatus, type Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessError, NotFoundError, ValidationError } from "@/lib/errors";
import { applyLedger, withTransaction } from "../wallet/wallet-service";
import { logAudit } from "../audit/audit-service";
import { createNotification } from "../notifications/notification-service";

/**
 * User management (admin side) + shared user reads.
 * All mutations are server-side authorized and audit-logged.
 */

export interface UserListOptions {
  query?: string;
  status?: UserStatus | "ALL";
  role?: Role | "ALL";
  page?: number;
  pageSize?: number;
  sort?: "newest" | "oldest" | "name";
}

export async function listUsers(opts: UserListOptions = {}) {
  const { query, status, role, page = 1, pageSize = 20, sort = "newest" } = opts;
  const where: Prisma.UserWhereInput = {
    ...(status && status !== "ALL" ? { status } : {}),
    ...(role && role !== "ALL" ? { role } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { username: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { referralCode: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.UserOrderByWithRelationInput =
    sort === "oldest" ? { createdAt: "asc" } : sort === "name" ? { name: "asc" } : { createdAt: "desc" };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        referralCode: true,
        createdAt: true,
        lastLoginAt: true,
        sponsor: { select: { name: true, username: true } },
        _count: { select: { referrals: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);
  return { items, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getUserAdminDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      wallet: true,
      sponsor: { select: { id: true, name: true, username: true, email: true } },
      referrals: {
        select: { id: true, name: true, username: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      rank: { include: { rank: true } },
      kycSubmissions: { orderBy: { createdAt: "desc" }, take: 3 },
      _count: { select: { referrals: true } },
    },
  });
  if (!user) throw new NotFoundError("User not found.");

  const [commissions, withdrawals, transactions, teamStats] = await Promise.all([
    prisma.commission.findMany({
      where: { beneficiaryId: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.withdrawal.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.user.count({ where: { sponsorId: userId } }),
  ]);

  return { user, commissions, withdrawals, transactions, directReferralCount: teamStats };
}

export const adminUpdateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(20).optional(),
  address: z.string().trim().max(300).optional(),
  country: z.string().trim().max(80).optional(),
});

export async function adminUpdateUser(
  admin: { id: string },
  userId: string,
  raw: unknown,
  ip?: string
): Promise<void> {
  const parsed = adminUpdateUserSchema.safeParse(raw);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!user) throw new NotFoundError("User not found.");

    const data: Prisma.UserUpdateInput = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.phone !== undefined) data.phone = parsed.data.phone;

    const profileData: { address?: string; country?: string } = {};
    if (parsed.data.address !== undefined) profileData.address = parsed.data.address;
    if (parsed.data.country !== undefined) profileData.country = parsed.data.country;

    await tx.user.update({ where: { id: userId }, data });
    if (Object.keys(profileData).length > 0) {
      await tx.profile.upsert({
        where: { userId },
        create: { userId, ...profileData },
        update: profileData,
      });
    }

    await logAudit(
      admin.id,
      {
        action: "USER_UPDATED",
        targetType: "User",
        targetId: userId,
        previousValue: { name: user.name, phone: user.phone },
        newValue: parsed.data,
        ip,
      },
      tx
    );
  });
}

export const STATUS_VALUES: UserStatus[] = ["ACTIVE", "PENDING", "INACTIVE", "SUSPENDED"];

export async function setUserStatus(
  admin: { id: string },
  userId: string,
  status: UserStatus,
  reason?: string,
  ip?: string
): Promise<void> {
  if (!STATUS_VALUES.includes(status)) throw new ValidationError("Invalid status.");
  if (admin.id === userId) {
    throw new BusinessError("You cannot change your own account status from the admin UI.");
  }

  await withTransaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError("User not found.");
    if (user.role === "ADMIN" && status !== "ACTIVE") {
      throw new BusinessError("Administrator accounts cannot be suspended from this UI.");
    }

    await tx.user.update({ where: { id: userId }, data: { status } });

    if (status === "SUSPENDED") {
      await createNotification(tx, userId, {
        type: "ANNOUNCEMENT",
        title: "Account suspended",
        body: reason
          ? `Your account has been suspended. Reason: ${reason}. Contact support for details.`
          : "Your account has been suspended. Contact support for details.",
      });
    }

    await logAudit(
      admin.id,
      {
        action: status === "SUSPENDED" ? "USER_SUSPENDED" : "USER_STATUS_CHANGED",
        targetType: "User",
        targetId: userId,
        previousValue: { status: user.status },
        newValue: { status, reason: reason ?? null },
        ip,
      },
      tx
    );
  });
}

/**
 * Manual wallet adjustment by an admin (corrections only). Always creates a
 * ledger entry + transaction + audit log. Amount is signed.
 */
export const adjustWalletSchema = z.object({
  amount: z.coerce.number().refine((n) => n !== 0, "Amount cannot be zero."),
  reason: z.string().trim().min(3, "A reason is required.").max(300),
});

export async function adjustWallet(
  admin: { id: string },
  userId: string,
  raw: unknown,
  ip?: string
): Promise<void> {
  const parsed = adjustWalletSchema.safeParse(raw);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  const { amount, reason } = parsed.data;
  if (Math.abs(amount) > 100000) {
    throw new ValidationError("Adjustment amount is too large (max ±100,000).");
  }

  await withTransaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, name: true } });
    if (!user) throw new NotFoundError("User not found.");

    const transaction = await tx.transaction.create({
      data: {
        userId,
        type: "ADJUSTMENT",
        amount: new Prisma.Decimal(amount),
        status: "COMPLETED",
        description: `Manual wallet adjustment: ${reason}`,
      },
    });

    await applyLedger(tx, userId, {
      type: "ADJUSTMENT",
      balanceType: "AVAILABLE",
      amount,
      description: `Admin adjustment: ${reason}`,
      transactionId: transaction.id,
      idempotencyKey: `adjustment:${transaction.id}`,
    });

    await logAudit(
      admin.id,
      {
        action: "WALLET_ADJUSTED",
        targetType: "User",
        targetId: userId,
        newValue: { amount, reason, transactionId: transaction.id },
        ip,
      },
      tx
    );
  });
}
