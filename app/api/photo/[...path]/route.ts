import { promises as fs } from "node:fs";
import path from "node:path";
import { contentTypeFor, resolvePhotoPath } from "@/lib/paths";
import { getPhoto, storageConfigured } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Streams a person photo. Local disk first (the on-machine flow, path-sandboxed
 * to /data/people); if it isn't on disk and R2 is configured, the same path is
 * treated as an R2 object key (`people/<personId>/<file>`) and streamed from
 * the cloud bucket. This lets one URL scheme serve both storage modes.
 */
export async function GET(
  _req: Request,
  { params }: { params: { path: string[] } }
) {
  const relative = (params.path ?? []).map((seg) => decodeURIComponent(seg)).join("/");

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

  // 2) R2 object key.
  if (storageConfigured() && relative && !relative.includes("..")) {
    const obj = await getPhoto(relative);
    if (obj) {
      return new Response(obj.body, {
        status: 200,
        headers: {
          "Content-Type": obj.contentType,
          // R2 keys are immutable (Date.now()-prefixed on upload), so a photo
          // at a given path never changes — cache it hard on the client.
          "Cache-Control": "private, max-age=3600, immutable",
        },
      });
    }
  }

  return new Response("Not found", { status: 404 });
}
