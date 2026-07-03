/**
 * Convert any HEIC/HEIF files to JPEG in the browser so the hosted uploader
 * (JPG/PNG/WebP only in the cloud) accepts them. heic2any is ~1.4MB and only
 * needed for iOS library photos, so it's dynamically imported on first use.
 * A conversion failure falls through with the original file — the server then
 * rejects it with guidance rather than the whole batch failing.
 *
 * Client-only (uses a browser wasm decoder). Shared by the capture flow and
 * progress check-ins.
 */
export async function normalizeForUpload(files: File[]): Promise<File[]> {
  const isHeic = (f: File) =>
    /\.hei[cf]$/i.test(f.name) ||
    f.type === "image/heic" ||
    f.type === "image/heif";
  if (!files.some(isHeic)) return files;

  let convert: typeof import("heic2any").default | null = null;
  const out: File[] = [];
  for (const f of files) {
    if (!isHeic(f)) {
      out.push(f);
      continue;
    }
    try {
      convert = convert ?? (await import("heic2any")).default;
      const res = await convert({ blob: f, toType: "image/jpeg", quality: 0.9 });
      const blob = Array.isArray(res) ? res[0] : res;
      const name = f.name.replace(/\.hei[cf]$/i, ".jpg");
      out.push(new File([blob], name, { type: "image/jpeg" }));
    } catch {
      out.push(f);
    }
  }
  return out;
}
