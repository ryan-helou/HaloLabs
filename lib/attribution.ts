/**
 * First-touch marketing attribution helpers (pure, no I/O — unit-tested).
 *
 * The flow: AttributionCapture writes utm_* + referrer to the `hl_attr` cookie →
 * the person route stamps it on the guest User (parseAttributionCookie) → the
 * checkout flattens it into Stripe metadata (flattenAttribution) → the webhook
 * reads it back (readAttribution) to record + attribute the conversion.
 */

export const ATTR_COOKIE = "hl_attr";

/**
 * Flatten an attribution object into Stripe metadata keys. Stripe caps metadata
 * at 50 keys and 500 chars/value, so keys are `attr_`-prefixed (≤40 chars) and
 * values sliced to 480. Nullish values are dropped.
 */
export function flattenAttribution(attr: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(attr)) {
    if (v == null) continue;
    out[`attr_${k}`.slice(0, 40)] = String(v).slice(0, 480);
  }
  return out;
}

/** Pull the attr_* keys back out of Stripe metadata into a plain attribution map. */
export function readAttribution(
  md: Record<string, string> | null | undefined
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(md ?? {})) {
    if (k.startsWith("attr_") && typeof v === "string") out[k.slice(5)] = v;
  }
  return out;
}

/** Safely parse the hl_attr cookie JSON; returns {} on anything malformed. */
export function parseAttributionCookie(raw: string | undefined | null): Record<string, string> {
  if (!raw) return {};
  try {
    const a = JSON.parse(decodeURIComponent(raw));
    return a && typeof a === "object" && !Array.isArray(a) ? (a as Record<string, string>) : {};
  } catch {
    return {};
  }
}
