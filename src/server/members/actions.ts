"use server";

import { revalidatePath } from "next/cache";
import { revalidateMemberPaths } from "./revalidate";
import { AppError, getUserSafeMessage, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { requireActiveUser, requireUser } from "../auth/guards";
import { requestWithdrawal, cancelWithdrawal } from "../withdrawal/withdrawal-service";
import { submitKyc } from "../kyc/kyc-service";
import { createPurchase, cancelPurchaseByMember } from "../payment/payment-service";
import { z } from "zod";

export interface MemberActionResult {
  error?: string;
  info?: string;
  fieldErrors?: Record<string, string[]>;
}

function wrap(fn: () => Promise<void | { info?: string }>): Promise<MemberActionResult> {
  return fn()
    .then((r) => ({ info: r?.info }))
    .catch((e) => {
      if (e instanceof AppError) {
        return { error: e.message, fieldErrors: e.fieldErrors };
      }
      return { error: getUserSafeMessage(e) };
    });
}


export async function requestWithdrawalAction(_prev: MemberActionResult, formData: FormData): Promise<MemberActionResult> {
  const user = await requireActiveUser();
  return wrap(async () => {
    await requestWithdrawal(user.id, {
      amount: formData.get("amount"),
      paymentMethod: formData.get("paymentMethod"),
      accountDetails: formData.get("accountDetails"),
      note: formData.get("note") || undefined,
    });
    revalidateMemberPaths();
    return { info: "Withdrawal requested. Funds are held until it is reviewed and completed." };
  });
}

export async function cancelWithdrawalAction(_prev: MemberActionResult, formData: FormData): Promise<MemberActionResult> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  return wrap(async () => {
    await cancelWithdrawal(id, user.id);
    revalidateMemberPaths();
    return { info: "Withdrawal cancelled. The held amount has been refunded to your wallet." };
  });
}

export async function submitKycAction(_prev: MemberActionResult, formData: FormData): Promise<MemberActionResult> {
  const user = await requireActiveUser();
  return wrap(async () => {
    await submitKyc(user.id, {
      fullName: formData.get("fullName"),
      dateOfBirth: formData.get("dateOfBirth") || undefined,
      address: formData.get("address") || undefined,
      documentType: formData.get("documentType"),
      documentNumber: formData.get("documentNumber"),
      document: formData.get("document") as File | null,
      supporting: (formData.get("supporting") as File | null) ?? null,
    });
    revalidateMemberPaths();
    return { info: "KYC submitted. It will be reviewed by the administrator." };
  });
}

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Name is too short.").max(100),
  phone: z.string().trim().min(6, "Invalid phone.").max(20),
  address: z.string().trim().max(300).optional(),
  country: z.string().trim().max(80).optional(),
  dateOfBirth: z.string().optional(),
});

export async function updateProfileAction(_prev: MemberActionResult, formData: FormData): Promise<MemberActionResult> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    address: formData.get("address") || undefined,
    country: formData.get("country") || undefined,
    dateOfBirth: formData.get("dateOfBirth") || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }
  return wrap(async () => {
    await prisma.user.update({
      where: { id: user.id },
      data: { name: parsed.data.fullName, phone: parsed.data.phone },
    });
    await prisma.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        address: parsed.data.address,
        country: parsed.data.country,
        dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
      },
      update: {
        address: parsed.data.address,
        country: parsed.data.country,
        dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
      },
    });
    revalidateMemberPaths();
    return { info: "Profile updated." };
  });
}

export async function markNotificationReadAction(_prev: MemberActionResult, formData: FormData): Promise<MemberActionResult> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  return wrap(async () => {
    await prisma.notification.updateMany({ where: { id, userId: user.id }, data: { read: true } });
    revalidatePath("/notifications");
  });
}

export async function markAllNotificationsReadAction(_prev: MemberActionResult, _formData: FormData): Promise<MemberActionResult> {
  const user = await requireUser();
  return wrap(async () => {
    await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
    revalidatePath("/notifications");
    return { info: "All notifications marked as read." };
  });
}

export async function changePasswordAction(_prev: MemberActionResult, formData: FormData): Promise<MemberActionResult> {
  const user = await requireUser();
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!account?.passwordHash) {
    return { error: "Passwordless accounts cannot change their password from the UI." };
  }
  const { compare } = await import("bcryptjs");
  if (!(await compare(current, account.passwordHash))) {
    return { error: "Current password is incorrect." };
  }
  if (next.length < 8 || !/[a-zA-Z]/.test(next) || !/[0-9]/.test(next)) {
    return { error: "New password must be at least 8 characters and contain a letter and a number.", fieldErrors: { newPassword: ["Min 8 characters, with a letter and a number."] } };
  }
  if (next !== confirm) {
    return { error: "Passwords do not match.", fieldErrors: { confirmPassword: ["Passwords do not match."] } };
  }
  const { hash } = await import("bcryptjs");
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hash(next, 12) } });
  return { info: "Password updated successfully." };
}

export async function createPurchaseAction(_prev: MemberActionResult, formData: FormData): Promise<MemberActionResult> {
  const user = await requireActiveUser();
  const packageId = String(formData.get("packageId") ?? "");
  return wrap(async () => {
    const result = await createPurchase(user.id, packageId, "manual");
    const { getSystemSetting } = await import("../settings/system-settings");
    const instructions =
      (await getSystemSetting<string>("payment_instructions")) ??
      "Send your payment to the account details provided by support, referencing your payment reference. An administrator verifies the transfer and confirms your payment.";
    revalidateMemberPaths();
    return { info: `Payment reference: ${result.reference} · ${result.amount.toFixed(2)} ${result.currency}\n\n${instructions}` };
  });
}

export async function cancelPurchaseAction(_prev: MemberActionResult, formData: FormData): Promise<MemberActionResult> {
  const user = await requireActiveUser();
  const id = String(formData.get("id") ?? "");
  return wrap(async () => {
    await cancelPurchaseByMember(id, user.id);
    revalidateMemberPaths();
    return { info: "Purchase cancelled." };
  });
}
