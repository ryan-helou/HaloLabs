/**
 * Capability detection. Each cloud integration (R2, Anthropic, Stripe) is
 * optional: when its env vars are present the app runs in "cloud mode" for that
 * capability, and when they're absent it falls back to the local/on-machine
 * behavior. This keeps the repo runnable end-to-end in dev with just a database
 * while the production keys live only in Railway.
 */

export const R2 = {
  accountId: process.env.R2_ACCOUNT_ID ?? "",
  accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  bucket: process.env.R2_BUCKET ?? "halolabs-photos",
};

/** True when R2 credentials are fully configured (photos go to the cloud). */
export function storageConfigured(): boolean {
  return Boolean(R2.accountId && R2.accessKeyId && R2.secretAccessKey && R2.bucket);
}

/** True when a Claude API key is present (server-side hosted analysis works). */
export function anthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export const STRIPE = {
  secretKey: process.env.STRIPE_SECRET_KEY ?? "",
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  priceId: process.env.STRIPE_PRICE_ID ?? "",
};

/** True when Stripe can create Checkout sessions. */
export function stripeConfigured(): boolean {
  return Boolean(STRIPE.secretKey && STRIPE.priceId);
}

/** Public base URL, used for Stripe redirect + email links. */
export function appUrl(): string {
  return (
    process.env.APP_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.AUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}
