import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config — no bcrypt, no Prisma, no Node APIs — so it can be
 * imported by middleware (which runs on the edge runtime). The full config in
 * lib/auth.ts spreads this and adds the Credentials provider + adapter.
 *
 * `authorized` is the route gate: it runs in middleware and decides, from the
 * JWT alone, whether a request may proceed. Unauthenticated hits on protected
 * paths are redirected to the sign-in page automatically.
 */

// App areas that require a signed-in account. The public landing page, the
// auth pages, and Next internals stay open.
const PROTECTED_PREFIXES = ["/profiles", "/person", "/start"];

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  // Providers are added in lib/auth.ts; middleware only needs the shape.
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected = PROTECTED_PREFIXES.some((p) =>
        nextUrl.pathname.startsWith(p)
      );
      if (isProtected) return isLoggedIn; // false → redirect to signIn
      return true;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
