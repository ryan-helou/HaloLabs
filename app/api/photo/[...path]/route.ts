import { promises as fs } from "node:fs";
import path from "node:path";
import { contentTypeFor, resolvePhotoPath } from "@/lib/paths";
import { getPhoto } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Streams a person photo. Local disk first (the on-machine flow, path-sandboxed
 * to /data/people, and legacy on-volume photos); otherwise the same path is a
 * storage key (`people/<personId>/<file>`) served from the configured backend —
 * R2 or Postgres (lib/storage). One URL scheme serves every storage mode.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const relative = ((await params).path ?? []).map((seg) => decodeURIComponent(seg)).join("/");

  // 1) Local disk (sandboxed). Serve if the file actually exists there.
  const abs = resolvePhotoPath(relative);
  if (abs) {
    try {
      const stat = await fs.stat(abs);
      if (stat.isFile()) {
        const data = await fs.readFile(abs);
        return new Response(new Uint8Array(data), {
          status: 200,
          headers: {
            "Content-Type": contentTypeFor(path.extname(abs)),
            "Cache-Control": "no-store",
          },
        });
      }
    } catch {
      /* fall through to R2 */
    }
  }

  // 2) Storage key (R2 or Postgres, per lib/storage).
  if (relative && !relative.includes("..")) {
    const obj = await getPhoto(relative);
    if (obj) {
      return new Response(obj.body, {
        status: 200,
        headers: {
          "Content-Type": obj.contentType,
          // Keys are immutable (Date.now()-prefixed on upload), so a photo at a
          // given path never changes — cache it hard on the client.
          "Cache-Control": "private, max-age=3600, immutable",
        },
      });
    }
  }

  return new Response("Not found", { status: 404 });
}
