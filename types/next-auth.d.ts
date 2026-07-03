import type { DefaultSession } from "next-auth";

// Augment the session/JWT with the fields lib/auth.ts populates.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      /** Entitlement flag the paywall reads ("active" = unlocked). */
      subscriptionStatus: string;
      /** True for a passwordless guest account (free-scan entry, not yet claimed). */
      isGuest: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** User id, stamped at sign-in. */
    uid?: string;
  }
}
