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
