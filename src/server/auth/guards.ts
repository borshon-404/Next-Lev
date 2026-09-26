import { cache } from "react";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import type { Role, UserStatus } from "@prisma/client";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  username: string;
  role: Role;
  status: UserStatus;
}

function toSessionUser(session: Session | null): SessionUser | null {
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    username: session.user.username,
    role: session.user.role,
    status: session.user.status,
  };
}

/** For pages/layouts: redirects unauthenticated visitors to /login. */
export const requireUserPage = cache(async (): Promise<SessionUser> => {
  const session: Session | null = await auth();
  const user = toSessionUser(session);
  if (!user) redirect("/login");
  if (user.status === "SUSPENDED") redirect("/login?error=SUSPENDED");
  return user;
});

/** For pages: member area guard. */
export async function requireMemberPage(): Promise<SessionUser> {
  const user = await requireUserPage();
  if (user.role !== "MEMBER" && user.role !== "ADMIN") redirect("/login");
  return user;
}

/** For pages: admin area guard (admins only). */
export async function requireAdminPage(): Promise<SessionUser> {
  const user = await requireUserPage();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

/**
 * For server actions / API routes: throws instead of redirecting so the
 * caller can return a structured error to the client.
 */
export async function requireUser(): Promise<SessionUser> {
  const session: Session | null = await auth();
  const user = toSessionUser(session);
  if (!user) throw new UnauthorizedError();
  if (user.status === "SUSPENDED") {
    throw new ForbiddenError("Your account is suspended. Contact support.");
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new ForbiddenError("Administrator access is required.");
  }
  return user;
}

/** Like requireUser but also rejects accounts that are not ACTIVE. */
export async function requireActiveUser(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.status !== "ACTIVE") {
    throw new ForbiddenError(
      user.status === "PENDING"
        ? "Your account is pending activation. Complete the required steps or contact support."
        : "Your account is not active."
    );
  }
  return user;
}
