import path from "node:path";

/** Absolute path to the /data directory (repo-root/data). */
export const DATA_DIR = path.join(process.cwd(), "data");

/** Absolute path to /data/people. */
export const PEOPLE_DIR = path.join(DATA_DIR, "people");

/** Absolute path to /data/results.json. */
export const RESULTS_FILE = path.join(DATA_DIR, "results.json");

/** Absolute path to /data/progress.json (suggestion check-offs). */
export const PROGRESS_FILE = path.join(DATA_DIR, "progress.json");

/** Allowed image extensions (lowercased, with dot). */
export const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

/** Upload-only extensions we accept on intake (HEIC/HEIF converted to jpg). */
export const UPLOAD_IMAGE_EXTS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
]);

/** Allowed video extensions for optional video intake. */
export const VIDEO_EXTS = new Set([".mp4", ".mov", ".webm"]);

/**
 * Turn a display name into a safe person-id slug ("Alex Rivera" →
 * "alex-rivera"). Returns null if nothing usable remains.
 */
export function slugifyPersonId(name: string): string | null {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug.length >= 2 ? slug : null;
}

/**
 * Resolve a person id to its absolute folder path, guaranteeing it stays
 * inside /data/people. Returns null for traversal attempts or bad ids.
 */
export function resolvePersonDir(id: string): string | null {
  if (!id || id.includes("\0") || id.includes("/") || id.includes("\\")) {
    return null;
  }
  const abs = path.resolve(PEOPLE_DIR, id);
  const rel = path.relative(PEOPLE_DIR, abs);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return abs;
}

/**
 * Resolve a relative photo path (as stored in results.json, e.g.
 * "<person-id>/photo1.jpg") to an absolute path, guaranteeing the result
 * stays inside /data/people. Returns null if the path escapes the sandbox.
 */
export function resolvePhotoPath(relative: string): string | null {
  // Reject anything with a NUL byte outright.
  if (relative.includes("\0")) return null;

  // Normalize and join against the people dir.
  const abs = path.resolve(PEOPLE_DIR, relative);

  // Must stay within PEOPLE_DIR (guards against ../ traversal & absolute paths).
  const rel = path.relative(PEOPLE_DIR, abs);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
    return null;
  }

  // Extension allow-list.
  if (!IMAGE_EXTS.has(path.extname(abs).toLowerCase())) {
    return null;
  }

  return abs;
}

/** Map an image extension to a Content-Type. */
export function contentTypeFor(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".jpg":
    case ".jpeg":
    default:
      return "image/jpeg";
  }
}
