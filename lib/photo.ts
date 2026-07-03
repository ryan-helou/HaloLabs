/**
 * Canonical guided-capture order. Files land named `camera-<shotKey>.jpg`, but a
 * plain alphabetical sort puts "detail" first (d < f), so the extreme close-up
 * ends up as photo #1 — in the hero, and as one of the two shots the teaser
 * analyzes. Rank by the intended shot sequence instead so the front portrait
 * leads; names without a known shot key keep a stable order after the known ones.
 */
const SHOT_ORDER = [
  "front-neutral",
  "front-smile",
  "left-profile",
  "right-profile",
  "three-quarter",
  "detail",
];

export function orderCapturePhotos<T extends string>(names: T[]): T[] {
  const rank = (n: string) => {
    const i = SHOT_ORDER.findIndex((k) => n.toLowerCase().includes(k));
    return i < 0 ? SHOT_ORDER.length : i;
  };
  return [...names].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/**
 * Build the viewer URL for a stored photo path (e.g. "alex-rivera/photo1.jpg").
 * Each path segment is URL-encoded so spaces/odd characters survive.
 */
export function photoUrl(relativePath: string): string {
  const encoded = relativePath
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `/api/photo/${encoded}`;
}
