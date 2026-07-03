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

export function track(
  event: TrackEvent,
  props?: Record<string, string | number | boolean>
): void {
  if (typeof window === "undefined") return;
  try {
    window.plausible?.(event, props ? { props } : undefined);
  } catch {
    /* analytics is best-effort — never let it surface to the user */
  }
}
