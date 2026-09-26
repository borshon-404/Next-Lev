import { randomUUID } from "crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ConflictError, ValidationError } from "@/lib/errors";
import { assertRateLimit } from "@/lib/rate-limit";
import { generateReferralCode } from "@/lib/ids";
import { registerSchema, zodFieldErrors } from "./schemas";
import { getMlmSettings } from "../mlm/settings-service";
import { ensureWallet } from "../wallet/wallet-service";
import { createNotification } from "../notifications/notification-service";
import { issueToken, TOKEN_TTL_MINUTES } from "./tokens";
import { mailer, wrapEmailHtml } from "../notifications/mailer";
import { evaluateUserRank } from "../rank/rank-service";

export interface RegisterResult {
  userId: string;
  email: string;
  referralCode: string;
  autoActivated: boolean;
  emailVerificationRequired: boolean;
  verificationUrl?: string;
}

/** Sponsor preview shown on the register page when ?ref=CODE is present. */
export async function getSponsorByReferralCode(code: string) {
  const sponsor = await prisma.user.findUnique({
    where: { referralCode: code.toUpperCase() },
    select: { id: true, name: true, username: true, image: true, status: true, referralCode: true },
  });
  if (!sponsor || sponsor.status !== "ACTIVE") return null;
  return sponsor;
}

/**
 * Registration: the ONLY way members enter the system.
 *
 * - Validates input server-side (zod).
 * - Resolves + validates the referral code, stores the sponsor permanently
 *   (never changeable through the UI afterwards).
 * - Creates User + Profile + Wallet atomically.
 * - Records an immutable Referral row and notifies the sponsor.
 */
export async function registerUser(
  rawInput: unknown,
  ctx: { ip?: string } = {}
): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ValidationError("Please fix the highlighted fields.", zodFieldErrors(parsed.error));
  }
  const input = parsed.data;

  assertRateLimit(`register:${ctx.ip ?? "unknown"}`, 10, 10 * 60 * 1000);

  const email = input.email.toLowerCase();

  const [existingEmail, existingUsername] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { username: input.username } }),
  ]);
  if (existingEmail) {
    throw new ValidationError("Registration failed.", { email: ["An account with this email already exists."] });
  }
  if (existingUsername) {
    throw new ValidationError("Registration failed.", {
      username: ["This username is already taken."],
    });
  }

  const settings = await getMlmSettings();

  // --- Sponsor resolution ---------------------------------------------------
  const referralCode = input.referralCode?.toUpperCase();
  if (settings.referralRequired && !referralCode) {
    throw new ValidationError("Registration failed.", {
      referralCode: ["A referral code is required to register."],
    });
  }
  let sponsor: { id: string; name: string; status: string; depth: number; path: string } | null = null;
  if (referralCode) {
    sponsor = await prisma.user.findUnique({
      where: { referralCode },
      select: { id: true, name: true, status: true, depth: true, path: true },
    });
    if (!sponsor) {
      throw new ValidationError("Registration failed.", { referralCode: ["Invalid referral code."] });
    }
    if (sponsor.status !== "ACTIVE") {
      throw new ValidationError("Registration failed.", {
        referralCode: ["This referral code belongs to an inactive account."],
      });
    }
  }

  // --- Unique referral code for the new member -------------------------------
  let myReferralCode = generateReferralCode(input.username);
  for (let attempt = 0; attempt < 10; attempt++) {
    const clash = await prisma.user.findUnique({ where: { referralCode: myReferralCode } });
    if (!clash) break;
    myReferralCode = generateReferralCode(input.username);
  }

  const passwordHash = await hash(input.password, 12);
  const id = randomUUID();
  const autoActivated = settings.autoActivate;
  // Genealogy: materialized path + depth (a brand-new user can never create a
  // cycle because it has no descendants yet).
  const path = `${sponsor ? sponsor.path : "."}${id}.`;
  const depth = sponsor ? sponsor.depth + 1 : 0;

  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        id,
        name: input.fullName,
        email,
        username: input.username,
        phone: input.phone,
        passwordHash,
        referralCode: myReferralCode,
        termsAccepted: true,
        status: autoActivated ? "ACTIVE" : "PENDING",
        sponsorId: sponsor?.id ?? null,
        depth,
        path,
        profile: { create: {} },
      },
    });
    await ensureWallet(id, tx);
    if (sponsor && referralCode) {
      await tx.referral.create({
        data: { referrerId: sponsor.id, refereeId: id, referralCode },
      });
      await createNotification(tx, sponsor.id, {
        type: "NEW_REFERRAL",
        title: "New team member joined",
        body: `${input.fullName} (@${input.username}) joined using your referral code.`,
        link: "/team",
      });
    }
  });

  // Assign the entry-level rank (no bonus for the initial assignment).
  await evaluateUserRank(id, { awardBonus: false });

  // --- Email verification (architecture; delivery via Mailer adapter) --------
  let verificationUrl: string | undefined;
  if (settings.emailVerificationRequired) {
    const token = await issueToken(email, "email-verification", TOKEN_TTL_MINUTES.emailVerification);
    const base = process.env.AUTH_URL ?? "http://localhost:3000";
    verificationUrl = `${base}/verify-email?token=${token}`;
    await mailer.send({
      to: email,
      subject: `Verify your ${process.env.APP_NAME ?? "Nexlev"} email`,
      html: wrapEmailHtml(
        "Confirm your email",
        `<p>Hi ${input.fullName},</p>
         <p>Click the link below to verify your email address:</p>
         <p><a href="${verificationUrl}">${verificationUrl}</a></p>
         <p>This link expires in 24 hours.</p>`
      ),
    });
  }

  return {
    userId: id,
    email,
    referralCode: myReferralCode,
    autoActivated,
    emailVerificationRequired: settings.emailVerificationRequired,
    verificationUrl,
  };
}
