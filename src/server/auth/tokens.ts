import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/ids";

/**
 * Verification tokens (Auth.js VerificationToken table) used for:
 *  - email verification ("email-verification:<email>")
 *  - password reset     ("password-reset:<email>")
 * Tokens are single-use, expiring, and stored hashed-free but opaque; they are
 * deleted on consumption and replaced when re-issued.
 */

export type TokenPurpose = "email-verification" | "password-reset";

export const TOKEN_TTL_MINUTES = {
  emailVerification: 24 * 60,
  passwordReset: 60,
} as const;

function identifier(purpose: TokenPurpose, email: string): string {
  return `${purpose}:${email.toLowerCase()}`;
}

export async function issueToken(
  email: string,
  purpose: TokenPurpose,
  ttlMinutes: number
): Promise<string> {
  const token = generateToken(32);
  const id = identifier(purpose, email);
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier: id } }),
    prisma.verificationToken.create({
      data: {
        identifier: id,
        token,
        expires: new Date(Date.now() + ttlMinutes * 60 * 1000),
      },
    }),
  ]);
  return token;
}

/** Consumes a token; returns the associated email or null if invalid/expired. */
export async function consumeToken(
  token: string,
  purpose: TokenPurpose
): Promise<string | null> {
  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record) return null;
  if (!record.identifier.startsWith(`${purpose}:`)) return null;
  if (record.expires.getTime() < Date.now()) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
    return null;
  }
  await prisma.verificationToken.delete({ where: { token } });
  return record.identifier.slice(purpose.length + 1);
}
