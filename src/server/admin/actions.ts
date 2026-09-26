"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { AppError, getUserSafeMessage, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "../auth/guards";
import { setUserStatus, adminUpdateUser, adjustWallet } from "../users/user-service";
import { approveCommission, cancelCommission } from "../commission/commission-service";
import { adminReviewWithdrawal } from "../withdrawal/withdrawal-service";
import { createDeposit, reviewDeposit } from "../deposit/deposit-service";
import { reviewKyc } from "../kyc/kyc-service";
import { updateMlmSettings, type UpdateMlmSettingsInput } from "../mlm/settings-service";
import { logAudit } from "../audit/audit-service";
import { broadcastAnnouncement } from "../notifications/notification-service";
import { setSystemSetting } from "../settings/system-settings";
import { z } from "zod";

export interface AdminActionResult {
  error?: string;
  info?: string;
  fieldErrors?: Record<string, string[]>;
}

async function adminIp(): Promise<string | undefined> {
  try {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
  } catch {
    return undefined;
  }
}

function wrap(fn: () => Promise<void | { info?: string }>): Promise<AdminActionResult> {
  return fn()
    .then((r) => ({ info: r?.info }))
    .catch((e) => {
      if (e instanceof AppError) return { error: e.message, fieldErrors: e.fieldErrors };
      return { error: getUserSafeMessage(e) };
    });
}

function revalidateAdminPaths(): void {
  for (const p of ["/admin", "/admin/users", "/admin/commissions", "/admin/withdrawals", "/admin/deposits", "/admin/kyc", "/admin/mlm-settings", "/admin/packages", "/admin/ranks"]) {
    revalidatePath(p);
  }
}

// --- Users -------------------------------------------------------------------

export async function setUserStatusAction(_prev: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  const id = String(formData.get("userId") ?? "");
  const status = String(formData.get("status") ?? "") as "ACTIVE" | "PENDING" | "INACTIVE" | "SUSPENDED";
  const reason = String(formData.get("reason") ?? "") || undefined;
  return wrap(async () => {
    await setUserStatus({ id: admin.id }, id, status, reason, await adminIp());
    revalidateAdminPaths();
    return { info: `User status set to ${status}.` };
  });
}

export async function adminUpdateUserAction(_prev: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  const id = String(formData.get("userId") ?? "");
  return wrap(async () => {
    await adminUpdateUser(
      { id: admin.id },
      id,
      {
        name: formData.get("name") || undefined,
        phone: formData.get("phone") || undefined,
        address: formData.get("address") || undefined,
        country: formData.get("country") || undefined,
      },
      await adminIp()
    );
    revalidateAdminPaths();
    return { info: "User updated." };
  });
}

export async function adjustWalletAction(_prev: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  const id = String(formData.get("userId") ?? "");
  return wrap(async () => {
    await adjustWallet({ id: admin.id }, id, { amount: formData.get("amount"), reason: formData.get("reason") }, await adminIp());
    revalidateAdminPaths();
    return { info: "Wallet adjusted. A ledger entry and audit record were created." };
  });
}

// --- Commissions ---------------------------------------------------------------

export async function approveCommissionAction(_prev: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  const id = String(formData.get("commissionId") ?? "");
  return wrap(async () => {
    await approveCommission(id);
    await logAudit(admin.id, { action: "COMMISSION_APPROVED", targetType: "Commission", targetId: id, ip: await adminIp() });
    revalidateAdminPaths();
    return { info: "Commission approved and moved to the member's available balance." };
  });
}

export async function cancelCommissionAction(_prev: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  const id = String(formData.get("commissionId") ?? "");
  const reason = String(formData.get("reason") ?? "") || undefined;
  return wrap(async () => {
    await cancelCommission(id, reason);
    await logAudit(admin.id, { action: "COMMISSION_CANCELLED", targetType: "Commission", targetId: id, newValue: { reason }, ip: await adminIp() });
    revalidateAdminPaths();
    return { info: "Commission cancelled and removed from the pending balance." };
  });
}

// --- Withdrawals & deposits ------------------------------------------------------

export async function reviewWithdrawalAction(_prev: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  const id = String(formData.get("withdrawalId") ?? "");
  const action = String(formData.get("action") ?? "") as "APPROVE" | "REJECT" | "COMPLETE" | "MARK_PROCESSING";
  const note = String(formData.get("note") ?? "") || undefined;
  return wrap(async () => {
    await adminReviewWithdrawal(id, { id: admin.id }, action, { note, ip: await adminIp() });
    revalidateAdminPaths();
    return { info: `Withdrawal ${action.toLowerCase()} processed.` };
  });
}

export async function createDepositAction(_prev: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  return wrap(async () => {
    await createDeposit({ id: admin.id }, {
      userId: formData.get("userId"),
      amount: formData.get("amount"),
      method: formData.get("method"),
      reference: formData.get("reference") || undefined,
      note: formData.get("note") || undefined,
    });
    revalidateAdminPaths();
    return { info: "Deposit created as PENDING. Complete it to credit the member's wallet." };
  });
}

export async function reviewDepositAction(_prev: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  const id = String(formData.get("depositId") ?? "");
  const decision = String(formData.get("decision") ?? "") as "COMPLETE" | "CANCEL";
  const note = String(formData.get("note") ?? "") || undefined;
  return wrap(async () => {
    await reviewDeposit(id, { id: admin.id }, decision, { note, ip: await adminIp() });
    revalidateAdminPaths();
    return { info: decision === "COMPLETE" ? "Deposit completed and credited to the wallet." : "Deposit cancelled." };
  });
}

// --- KYC --------------------------------------------------------------------------

export async function reviewKycAction(_prev: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  const id = String(formData.get("kycId") ?? "");
  const decision = String(formData.get("decision") ?? "") as "APPROVE" | "REJECT";
  const reason = String(formData.get("reason") ?? "") || undefined;
  return wrap(async () => {
    await reviewKyc(id, { id: admin.id }, decision, { reason, ip: await adminIp() });
    revalidateAdminPaths();
    return { info: `KYC ${decision.toLowerCase()}. The member has been notified.` };
  });
}

// --- Packages -----------------------------------------------------------------------

const packageSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(60),
  description: z.string().trim().max(600).optional(),
  price: z.coerce.number().positive("Price must be positive."),
  pv: z.coerce.number().min(0).optional(),
  isActive: z.boolean(),
  commissionEligible: z.boolean(),
});

export async function savePackageAction(_prev: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  const id = String(formData.get("packageId") ?? "");
  const parsed = packageSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
    pv: formData.get("pv") === "" ? undefined : Number(formData.get("pv")),
    isActive: formData.get("isActive") === "on",
    commissionEligible: formData.get("commissionEligible") === "on",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }
  const data = parsed.data;
  return wrap(async () => {
    if (id) {
      const previous = await prisma.package.findUnique({ where: { id } });
      if (!previous) throw new AppError("NOT_FOUND", "Package not found.");
      await prisma.package.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          price: data.price,
          pv: data.pv ?? 0,
          isActive: data.isActive,
          commissionEligible: data.commissionEligible,
        },
      });
      await logAudit(admin.id, {
        action: "PACKAGE_UPDATED",
        targetType: "Package",
        targetId: id,
        previousValue: { name: previous.name, price: Number(previous.price), isActive: previous.isActive },
        newValue: { name: data.name, price: data.price, isActive: data.isActive },
        ip: await adminIp(),
      });
    } else {
      const maxOrder = await prisma.package.aggregate({ _max: { sortOrder: true } });
      const created = await prisma.package.create({
        data: {
          name: data.name,
          description: data.description,
          price: data.price,
          pv: data.pv ?? 0,
          isActive: data.isActive,
          commissionEligible: data.commissionEligible,
          sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        },
      });
      await logAudit(admin.id, {
        action: "PACKAGE_CREATED",
        targetType: "Package",
        targetId: created.id,
        newValue: { name: data.name, price: data.price },
        ip: await adminIp(),
      });
    }
    revalidateAdminPaths();
    return { info: "Package saved." };
  });
}

// --- MLM settings --------------------------------------------------------------------

export async function saveMlmSettingsAction(_prev: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  const raw = formData.get("payload");
  let parsed: UpdateMlmSettingsInput;
  try {
    parsed = JSON.parse(String(raw ?? "{}")) as UpdateMlmSettingsInput;
  } catch {
    throw new ValidationError("Settings payload is malformed.");
  }

  return wrap(async () => {
    const { previous, next, previousRules, nextRules } = await updateMlmSettings(parsed);
    await logAudit(admin.id, {
      action: "MLM_SETTINGS_UPDATED",
      targetType: "MlmSettings",
      targetId: "default",
      previousValue: {
        settings: previous,
        rules: previousRules.map((r) => ({ level: r.level, percentage: Number(r.percentage), active: r.active })),
      },
      newValue: {
        settings: next,
        rules: nextRules.map((r) => ({ level: r.level, percentage: Number(r.percentage), active: r.active })),
      },
      ip: await adminIp(),
    });
    revalidateAdminPaths();
    return { info: "MLM settings saved. The public compensation plan page reflects the new configuration." };
  });
}

// --- Ranks ------------------------------------------------------------------------------

const rankSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(40),
  level: z.coerce.number().int().min(1).max(100),
  minDirectReferrals: z.coerce.number().int().min(0).default(0),
  minTeamMembers: z.coerce.number().int().min(0).default(0),
  minPersonalVolume: z.coerce.number().min(0).default(0),
  minTeamVolume: z.coerce.number().min(0).default(0),
  bonus: z.coerce.number().min(0).default(0),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #4f46e5").default("#6366f1"),
  isActive: z.boolean(),
});

export async function saveRankAction(_prev: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  const id = String(formData.get("rankId") ?? "");
  const parsed = rankSchema.safeParse({
    name: formData.get("name"),
    level: formData.get("level"),
    minDirectReferrals: formData.get("minDirectReferrals"),
    minTeamMembers: formData.get("minTeamMembers"),
    minPersonalVolume: formData.get("minPersonalVolume"),
    minTeamVolume: formData.get("minTeamVolume"),
    bonus: formData.get("bonus"),
    colorHex: formData.get("colorHex") || "#6366f1",
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }
  const data = parsed.data;
  return wrap(async () => {
    const clash = await prisma.rank.findFirst({ where: { name: data.name, ...(id ? { id: { not: id } } : {}) } });
    if (clash) throw new ValidationError("Another rank already uses this name.", { name: ["Rank name already taken."] });
    if (id) {
      await prisma.rank.update({ where: { id }, data: data });
      await logAudit(admin.id, { action: "RANK_UPDATED", targetType: "Rank", targetId: id, newValue: data, ip: await adminIp() });
    } else {
      const created = await prisma.rank.create({ data: data });
      await logAudit(admin.id, { action: "RANK_CREATED", targetType: "Rank", targetId: created.id, newValue: data, ip: await adminIp() });
    }
    revalidateAdminPaths();
    return { info: "Rank saved." };
  });
}

// --- Notifications & system settings ------------------------------------------------------

export async function broadcastAnnouncementAction(_prev: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (title.length < 3 || body.length < 10) {
    return { error: "Provide a title (min 3 chars) and a message (min 10 chars)." };
  }
  const count = await broadcastAnnouncement(title, body);
  revalidatePath("/admin/notifications");
  return { info: `Announcement sent to ${count} members.` };
}

const systemSettingsSchema = z.object({
  payment_instructions: z.string().trim().max(2000).optional(),
  support_email: z.string().trim().email().optional(),
});

export async function saveSystemSettingsAction(_prev: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  const parsed = systemSettingsSchema.safeParse({
    payment_instructions: formData.get("payment_instructions") || undefined,
    support_email: formData.get("support_email") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  return wrap(async () => {
    if (parsed.data.payment_instructions !== undefined) {
      await setSystemSetting("payment_instructions", parsed.data.payment_instructions);
    }
    if (parsed.data.support_email !== undefined) {
      await setSystemSetting("support_email", parsed.data.support_email);
    }
    await logAudit(admin.id, { action: "SYSTEM_SETTINGS_UPDATED", newValue: parsed.data, ip: await adminIp() });
    revalidatePath("/admin/settings");
    return { info: "System settings saved." };
  });
}
