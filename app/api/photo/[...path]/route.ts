import { promises as fs } from "node:fs";
import path from "node:path";
import { contentTypeFor, resolvePhotoPath } from "@/lib/paths";

export const dynamic = "force-dynamic";

/**
 * Streams a person photo from /data/people/<...>.
 *
 * Path safety: the requested path is decoded, joined against /data/people,
 * and rejected unless the resolved absolute path stays inside that directory
 * and has an allowed image extension. This blocks `../` traversal, absolute
 * paths, and non-image files.
 */
export async function GET(
  _req: Request,
  { params }: { params: { path: string[] } }
) {
  const relative = (params.path ?? []).map((seg) => decodeURIComponent(seg)).join("/");
  const abs = resolvePhotoPath(relative);
  if (!abs) {
    return new Response("Invalid path", { status: 400 });
  }

  let data: Buffer;
  try {
    const stat = await fs.stat(abs);
    if (!stat.isFile()) {
      return new Response("Not found", { status: 404 });
    }
    data = await fs.readFile(abs);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": contentTypeFor(path.extname(abs)),
      "Cache-Control": "no-store",
    },
  });
}
