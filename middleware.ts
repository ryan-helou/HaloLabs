import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Edge-safe: authConfig has no bcrypt/Prisma, and JWT sessions mean the gate
// reads the token directly. Calling `.auth` with no handler makes Auth.js run
// the `authorized` callback in authConfig to decide access, redirecting
// unauthenticated users on protected paths to /login.
export default NextAuth(authConfig).auth;

export const config = {
  // Run on everything except Next internals, the auth API, and static assets.
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)",
  ],
};
