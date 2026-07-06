/**
 * Server-side analytics — fires Plausible custom events from the backend (e.g.
 * the Stripe webhook), where the browser can't be trusted to still be open.
 * This is what makes `membership_active` a RELIABLE conversion signal instead of
 * one that depends on the buyer landing back on /profiles?upgraded=1.
 *
 * No-op (and never throws) unless NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set, so it's
 * safe to call unconditionally from any route.
 */
export async function sendServerEvent(
  name: string,
  props?: Record<string, string>
): Promise<void> {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return;
  const host = process.env.PLAUSIBLE_API_HOST || "https://plausible.io";
  try {
    await fetch(`${host}/api/event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Plausible attributes events by these; a stable server UA keeps the
        // conversion from polluting device/browser breakdowns.
        "User-Agent": "halolabs-server/1.0",
      },
      body: JSON.stringify({
        name,
        domain,
        url: `https://${domain}/__server`,
        props: props && Object.keys(props).length ? props : undefined,
      }),
    });
  } catch {
    /* analytics must never break the caller (a webhook, a purchase) */
  }
}
