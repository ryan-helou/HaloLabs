import type { DefaultSession } from "next-auth";

// Augment the session/JWT with the fields lib/auth.ts populates.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      /** Entitlement flag the paywall reads ("active" = unlocked). */
      subscriptionStatus: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** User id, stamped at sign-in. */
    uid?: string;
  }
}
