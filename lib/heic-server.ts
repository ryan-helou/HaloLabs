import convert from "heic-convert";

/**
 * Server-side HEIC/HEIF → JPEG. The browser converts iPhone photos before
 * upload (lib/heic.ts via heic2any), but that's best-effort — a failed or
 * bypassed conversion sends the raw HEIC here. sharp's prebuilt libvips only
 * decodes AVIF (not HEVC-coded HEIC), so we use heic-convert's bundled libheif
 * wasm decoder, which works on any platform (incl. the Railway Linux box).
 *
 * Node runtime only (wasm decoder). Callers must guard with runtime="nodejs".
 */
export async function heicToJpeg(buffer: Buffer): Promise<Buffer> {
  const out = await convert({ buffer, format: "JPEG", quality: 0.9 });
  return Buffer.from(out);
}
