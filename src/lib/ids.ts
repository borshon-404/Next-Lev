import { randomBytes, randomInt } from "crypto";

/**
 * Generate a human-friendly, URL-safe referral code.
 * Base: uppercase alphanumerics from the username, plus random digits,
 * e.g. "BORSHON123".
 */
export function generateReferralCode(username: string): string {
  const base = username
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  const digits = String(randomInt(100, 1000));
  return `${base || "NXL"}${digits}`;
}

/** Opaque random token (email verification, password reset, payment refs). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Short unique reference for payments, e.g. "PAY-K3JF9X2A". */
export function generateReference(prefix: string): string {
  return `${prefix}-${randomBytes(5).toString("base64url").toUpperCase()}`;
}
