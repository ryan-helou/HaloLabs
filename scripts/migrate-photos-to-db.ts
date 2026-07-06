import "dotenv/config";
import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { putPhoto, photoKey } from "@/lib/storage";
import { checkinKey } from "@/lib/checkins";
import { orderCapturePhotos } from "@/lib/photo";
import { resolvePersonDir, IMAGE_EXTS, contentTypeFor } from "@/lib/paths";

/**
 * One-time migration for people whose photos predate DB storage — they sit on
 * the web service's Railway volume (data/people/<id>/...) with NO Photo rows, so
 * the separate worker (which can't see that volume) can't read them. This walks
 * each such person's disk photos and re-stores them via putPhoto (→ PhotoBlob,
 * or R2 if configured) + creates Photo rows, making them worker-readable.
 *
 * MUST run where the volume is mounted — the web service:
 *   railway run --service web -- npx tsx scripts/migrate-photos-to-db.ts
 * Dry-run by default; set MIGRATE=1 to actually write. Idempotent: skips any
 * person that already has Photo rows.
 */

const WRITE = process.env.MIGRATE === "1";

async function baselineFiles(dir: string): Promise<string[]> {
  let entries: string[] = [];
  try {
    entries = (await fs.readdir(dir)).filter(
      (n) => !n.startsWith(".") && IMAGE_EXTS.has(path.extname(n).toLowerCase())
    );
  } catch {
    return [];
  }
  return orderCapturePhotos(entries);
}

async function progressGroups(dir: string): Promise<{ ts: number; files: string[] }[]> {
  const out: { ts: number; files: string[] }[] = [];
  const progressDir = path.join(dir, "progress");
  let tsDirs: string[] = [];
  try {
    tsDirs = await fs.readdir(progressDir);
  } catch {
    return [];
  }
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
    if (files.length) out.push({ ts, files });
  }
  return out;
}

async function main() {
  const people = await prisma.person.findMany({ select: { id: true, displayName: true } });
  let migrated = 0;
  let skipped = 0;

  for (const person of people) {
    const existing = await prisma.photo.count({ where: { personId: person.id } });
    if (existing > 0) {
      skipped++;
      continue;
    }
    const dir = resolvePersonDir(person.id);
    if (!dir) {
      continue;
    }

    const baseline = await baselineFiles(dir);
    const groups = await progressGroups(dir);
    const total = baseline.length + groups.reduce((n, g) => n + g.files.length, 0);
    if (total === 0) continue;

    console.log(
      `${WRITE ? "MIGRATE" : "DRY-RUN"} ${person.id} (${person.displayName}): ` +
        `${baseline.length} baseline + ${groups.length} check-in(s) = ${total} photo(s)`
    );

    if (!WRITE) continue;

    for (const name of baseline) {
      const buf = await fs.readFile(path.join(dir, name));
      const ct = contentTypeFor(path.extname(name));
      const key = photoKey(person.id, name);
      await putPhoto(key, buf, ct);
      await prisma.photo.create({
        data: { personId: person.id, r2Key: key, originalName: name, contentType: ct, sizeBytes: buf.byteLength },
      });
    }
    for (const g of groups) {
      for (const name of g.files) {
        const buf = await fs.readFile(path.join(dir, "progress", String(g.ts), name));
        const ct = contentTypeFor(path.extname(name));
        const key = checkinKey(person.id, g.ts, name);
        await putPhoto(key, buf, ct);
        await prisma.photo.create({
          data: { personId: person.id, r2Key: key, originalName: name, contentType: ct, sizeBytes: buf.byteLength },
        });
      }
    }
    migrated++;
  }

  console.log(
    `\n${WRITE ? "Migrated" : "Would migrate"} ${migrated} person(s); skipped ${skipped} already-in-DB.` +
      (WRITE ? "" : "  Set MIGRATE=1 to write.")
  );
  await prisma.$disconnect().catch(() => {});
}

main();
