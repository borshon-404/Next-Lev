"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppError, getUserSafeMessage } from "@/lib/errors";
import { assertRateLimit } from "@/lib/rate-limit";
import { hash } from "bcryptjs";
import { registerUser } from "./register-service";
import { forgotPasswordSchema, resetPasswordSchema, zodFieldErrors } from "./schemas";
import { issueToken, consumeToken, TOKEN_TTL_MINUTES } from "./tokens";
import { mailer, wrapEmailHtml } from "../notifications/mailer";

export interface ActionResult {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  info?: string;
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

/** Login. On success the Auth.js redirect (to /dashboard) is thrown. */
export async function loginAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  assertRateLimit(`login:${email}`, 8, 5 * 60 * 1000);

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      if ((error as AuthError & { code?: string }).code === "CredentialsSignin") {
        // Distinguish a suspended account (useful signal) without leaking other details.
        const user = await prisma.user.findUnique({ where: { email }, select: { status: true } });
        if (user?.status === "SUSPENDED") {
          return { error: "Your account is suspended. Contact support for details." };
        }
        return { error: "Invalid email or password." };
      }
      return { error: "Unable to sign in right now. Please try again later." };
    }
    // NEXT_REDIRECT (successful login) must propagate.
    throw error;
  }
  return {};
}

export async function registerAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const raw = {
    fullName: formData.get("fullName"),
    username: formData.get("username"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    referralCode: formData.get("referralCode") ?? "",
    acceptTerms: formData.get("acceptTerms") === "on",
  };

  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  try {
    const result = await registerUser(raw, { ip: "server" });
    if (result.emailVerificationRequired) {
      redirect("/login?verified=1");
    }
    redirect("/login?registered=1");
  } catch (error) {
    if (error instanceof AppError) {
      if (error.code === "VALIDATION") {
        return { error: error.message, fieldErrors: error.fieldErrors };
      }
      return { error: getUserSafeMessage(error) };
    }
    return { error: getUserSafeMessage(error) };
  }
}

export async function forgotPasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error) };
  }
  assertRateLimit(`forgot:${parsed.data.email}`, 3, 60 * 60 * 1000);

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  // Always respond the same way — never reveal whether an account exists.
  if (user) {
    const token = await issueToken(user.email, "password-reset", TOKEN_TTL_MINUTES.passwordReset);
    const base = process.env.AUTH_URL ?? "http://localhost:3000";
    const url = `${base}/reset-password?token=${token}`;
    await mailer.send({
      to: user.email,
      subject: "Reset your Nexlev password",
      html: wrapEmailHtml(
        "Reset your password",
        `<p>Hi ${user.name},</p>
         <p>Click the link below to choose a new password. It expires in one hour.</p>
         <p><a href="${url}">${url}</a></p>
         <p>If you did not request this, you can safely ignore this email.</p>`
      ),
    });
  }
  return { info: "If an account exists for that email, a password reset link has been sent." };
}

export async function resetPasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error) };
  }

  const email = await consumeToken(parsed.data.token, "password-reset");
  if (!email) {
    return { error: "This reset link is invalid or has expired. Please request a new one." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: "Account not found." };

  user.passwordHash = await hash(parsed.data.password, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: user.passwordHash } });
  redirect("/login?reset=1");
}

export async function verifyEmailAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const token = String(formData.get("token") ?? "");
  const email = await consumeToken(token, "email-verification");
  if (!email) {
    return { error: "This verification link is invalid or has expired." };
  }
  await prisma.user.update({ where: { email }, data: { emailVerified: new Date() } });
  redirect("/login?email-verified=1");
}
