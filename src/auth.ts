import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/server/auth/schemas";
import type { Role, UserStatus } from "@prisma/client";

/**
 * Auth.js v5 configuration.
 *
 * Strategy: JWT sessions (required for the Credentials provider and works on
 * serverless/Vercel). The Prisma adapter manages Account/Session/
 * VerificationToken persistence for future OAuth providers.
 *
 * The `jwt` callback re-reads role/status from the database so suspensions
 * and role changes take effect without waiting for token expiry.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user?.passwordHash) return null;

        const valid = await compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        if (user.status === "SUSPENDED") {
          // Surfaced on the login page via ?error=SUSPENDED
          throw new Error("SUSPENDED");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          username: user.username,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const u = user as { id?: string; username?: string; role?: Role; status?: UserStatus } | undefined;
      if (u?.id) {
        token.id = u.id;
        token.username = u.username;
        token.role = u.role;
        token.status = u.status;
      }
      // Keep role/status fresh from the DB (cheap indexed lookup by primary key).
      const tokenId = token.id as string | undefined;
      if (tokenId && !u) {
        const dbUser = await prisma.user.findUnique({
          where: { id: tokenId },
          select: { role: true, status: true, username: true, name: true },
        });
        if (!dbUser) return { ...token, id: undefined }; // user deleted → force re-auth
        token.role = dbUser.role;
        token.status = dbUser.status;
        token.username = dbUser.username;
        token.name = dbUser.name;
      }
      return token;
    },
    async session({ session, token }) {
      const id = token.id as string | undefined;
      if (session.user && id) {
        session.user.id = id;
        session.user.username = (token.username as string | undefined) ?? "";
        session.user.role = (token.role as Role | undefined) ?? "MEMBER";
        session.user.status = (token.status as UserStatus | undefined) ?? "ACTIVE";
      }
      return session;
    },
  },
});
