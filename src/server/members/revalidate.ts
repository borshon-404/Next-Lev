import { revalidatePath } from "next/cache";

/** Revalidates member pages after data mutations (plain helper — not a server action). */
export function revalidateMemberPaths(): void {
  for (const p of ["/dashboard", "/wallet", "/transactions", "/withdrawals", "/commissions", "/notifications", "/kyc", "/purchases", "/rank", "/team", "/profile"]) {
    revalidatePath(p);
  }
}
