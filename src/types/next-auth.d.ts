import type { DefaultSession } from "next-auth";
import type { Role, UserStatus } from "@prisma/client";

/**
 * Auth.js v5 type augmentation.
 *
 * next-auth v5 re-exports its core types from @auth/core, so the canonical
 * interfaces must be augmented at their source modules:
 *  - "@auth/core/types" → Session / User (returned by `auth()`)
 *  - "@auth/core/jwt"   → JWT token claims
 */

declare module "@auth/core/types" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: Role;
      status: UserStatus;
    } & DefaultSession["user"];
  }

  interface User {
    username?: string;
    role?: Role;
    status?: UserStatus;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    username?: string;
    role?: Role;
    status?: UserStatus;
  }
}
