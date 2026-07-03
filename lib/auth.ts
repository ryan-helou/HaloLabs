import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";

/**
 * Full Auth.js instance (Node runtime). Email + password today via the
 * Credentials provider; Google/OAuth can be added to `providers` later without
 * touching callers. Sessions are JWT (required for Credentials), so middleware
 * can authorize from the token alone with no DB round-trip.
 *
 * The Prisma adapter is wired now so OAuth account-linking works the moment a
 * social provider is added; for credentials we create users ourselves in the
 * register route.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .toLowerCase()
          .trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null; // no such user, or OAuth-only

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Stamp the user id onto the token at sign-in so the session can resolve it.
    jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    // Expose id + a freshly-read entitlement on the session. Reading
    // subscriptionStatus here (not from the token) means a Stripe status change
    // takes effect on the next request without forcing re-login.
    async session({ session, token }) {
      const uid = typeof token.uid === "string" ? token.uid : undefined;
      if (uid && session.user) {
        session.user.id = uid;
        const u = await prisma.user.findUnique({
          where: { id: uid },
          select: { subscriptionStatus: true },
        });
        session.user.subscriptionStatus = u?.subscriptionStatus ?? "inactive";
      }
      return session;
    },
  },
});
