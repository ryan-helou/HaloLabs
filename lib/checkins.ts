import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "./db";
import { resolvePersonDir, IMAGE_EXTS } from "./paths";

/**
 * Progress check-ins — the biweekly re-photo loop. A check-in is a batch of
 * progress photos taken on one day; we store them under a per-check-in key
 * (`people/<personId>/progress/<ts>/<file>`) so no schema change is needed —
 * the timestamp segment groups them, and the same Photo table + /api/photo +
 * R2-prefix cleanup all keep working. The baseline analysis photos live at the
 * person's top level and are filtered out of both re-analysis and this list.
 */

export interface Checkin {
  /** Epoch ms the check-in was taken (from the key). */
  ts: number;
  /** Photo path refs (as /api/photo relative paths), oldest-first order. */
  photos: string[];
}

const SEG = "/progress/";

/** R2 / disk key for a check-in photo. */
export function checkinKey(personId: string, ts: number, filename: string): string {
  return `people/${personId}/progress/${ts}/${filename}`;
}

/** Pull the check-in timestamp out of a progress key, or null if it isn't one. */
function tsFromKey(key: string): number | null {
  const i = key.indexOf(SEG);
  if (i === -1) return null;
  const rest = key.slice(i + SEG.length); // "<ts>/<file>"
  const ts = Number(rest.split("/")[0]);
  return Number.isFinite(ts) ? ts : null;
}

/** All of a person's check-ins, newest-first. */
export async function loadCheckins(personId: string): Promise<Checkin[]> {
  const groups = new Map<number, string[]>();

  // Cloud: Photo rows whose key marks them as progress photos. The ref is the
  // full r2Key (matching how baseline photos are stored) so /api/photo's R2
  // lookup keys on the exact object.
  const rows = await prisma.photo.findMany({
    where: { personId, r2Key: { contains: SEG } },
    orderBy: { uploadedAt: "asc" },
  });
  for (const row of rows) {
    const ts = tsFromKey(row.r2Key);
    if (ts === null) continue;
    (groups.get(ts) ?? groups.set(ts, []).get(ts)!).push(row.r2Key);
  }

  // Local disk fallback (dev): data/people/<id>/progress/<ts>/<file>.
  if (groups.size === 0) {
    const dir = resolvePersonDir(personId);
    if (dir) {
      const progressDir = path.join(dir, "progress");
      try {
        const tsDirs = await fs.readdir(progressDir);
        for (const tsName of tsDirs) {
          const ts = Number(tsName);
          if (!Number.isFinite(ts)) continue;
          let files: string[] = [];
          try {
            files = (await fs.readdir(path.join(progressDir, tsName))).filter(
              (n) => !n.startsWith(".") && IMAGE_EXTS.has(path.extname(n).toLowerCase())
            );
          } catch {
            files = [];
          }
          files.sort();
          if (files.length) {
            groups.set(
              ts,
              files.map((f) => `${personId}/progress/${ts}/${f}`)
            );
          }
        }
      } catch {
        /* no progress dir yet */
      }
    }
  }

  return [...groups.entries()]
    .map(([ts, photos]) => ({ ts, photos }))
    .sort((a, b) => b.ts - a.ts);
}
