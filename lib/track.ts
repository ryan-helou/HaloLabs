/**
 * Tiny client-side funnel tracking. Targets Plausible (cookieless, no PII, no
 * consent banner) so it fits the privacy promise — "we don't track you across
 * sites" — while still giving the numbers a paid UGC campaign needs: how many
 * landing views become signups, scans, and checkouts.
 *
 * A no-op until NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set (see components/Analytics),
 * and it never throws — analytics must not be able to break the funnel.
 */
export type TrackEvent =
  | "signup"
  | "scan_started"
  | "checkout_started"
  | "share_created"
  | "membership_active"
  | "account_claimed";

declare global {
  interface Window {
    plausible?: (
      event: string,
      opts?: { props?: Record<string, string | number | boolean> }
    ) => void;
  }
}

/**
 * Read the first-touch attribution cookie (set by AttributionCapture) and
 * surface source/campaign so every client funnel event is segmentable by the
 * content that drove it. The reliable purchase event still fires server-side
 * from the webhook (lib/analytics-server); this just enriches the funnel above.
 */
function attrProps(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const m = document.cookie.match(/(?:^|;\s*)hl_attr=([^;]+)/);
  if (!m) return {};
  try {
    const a = JSON.parse(decodeURIComponent(m[1])) as Record<string, string>;
    return { source: a.utm_source || a.referrer || "direct", campaign: a.utm_campaign || "" };
  } catch {
    return {};
  }
}

export function track(
  event: TrackEvent,
  props?: Record<string, string | number | boolean>
): void {
  if (typeof window === "undefined") return;
  try {
    const merged = { ...attrProps(), ...props };
    const hasProps = Object.keys(merged).length > 0;
    window.plausible?.(event, hasProps ? { props: merged } : undefined);
  } catch {
    /* analytics is best-effort — never let it surface to the user */
  }
}
