import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import {
  IMAGE_EXTS,
  UPLOAD_IMAGE_EXTS,
  VIDEO_EXTS,
  contentTypeFor,
  resolvePersonDir,
} from "@/lib/paths";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { putPhoto, photoKey, storageConfigured } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

const MAX_IMAGE_BYTES = 40 * 1024 * 1024; // 40MB
const MAX_VIDEO_BYTES = 400 * 1024 * 1024; // 400MB

/** Sanitize an uploaded filename to a safe basename (keeps its extension). */
function safeName(original: string): string {
  const ext = path.extname(original).toLowerCase();
  const stem = path
    .basename(original, path.extname(original))
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 60);
  return `${stem || "upload"}${ext}`;
}

/** Find a non-colliding path by suffixing -2, -3… before the extension. */
async function uniquePath(dir: string, name: string): Promise<string> {
  const ext = path.extname(name);
  const stem = path.basename(name, ext);
  for (let i = 0; i < 100; i++) {
    const candidate = path.join(dir, i === 0 ? name : `${stem}-${i + 1}${ext}`);
    try {
      await fs.access(candidate);
    } catch {
      return candidate;
    }
  }
  throw new Error("Too many name collisions");
}

/**
 * Accepts multipart uploads for a person: images (jpg/png/webp, plus
 * HEIC/HEIF converted to jpg via macOS `sips`) and optional videos
 * (mp4/mov/webm). Files land in data/people/<id>/ — they never leave this
 * machine.
 */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form" }, { status: 400 });
  }

  const id = String(form.get("id") ?? "");

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files received" }, { status: 400 });
  }

  // ── Cloud path: signed-in account uploading to a DB-backed person. Photos go
  // to R2 (with a Photo row) when configured, else to local disk in dev. ──────
  const session = await auth();
  if (session?.user?.id) {
    const person = await prisma.person.findFirst({
      where: { userId: session.user.id, id },
    });
    if (person) {
      return cloudUpload(id, files);
    }
  }

  // ── Local path (on-machine dev): profile.json + files on disk. ─────────────
  const dir = resolvePersonDir(id);
  if (!dir) {
    return NextResponse.json({ error: "Invalid person id" }, { status: 400 });
  }
  try {
    await fs.access(path.join(dir, "profile.json"));
  } catch {
    return NextResponse.json(
      { error: "Complete onboarding first — this profile doesn't exist yet." },
      { status: 404 }
    );
  }

  const saved: string[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const ext = path.extname(file.name).toLowerCase();
    const isImage = UPLOAD_IMAGE_EXTS.has(ext);
    const isVideo = VIDEO_EXTS.has(ext);

    if (!isImage && !isVideo) {
      errors.push(`${file.name}: unsupported type (photos: jpg/png/webp/heic, video: mp4/mov/webm)`);
      continue;
    }
    if (file.size > (isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) {
      errors.push(`${file.name}: too large`);
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const target = await uniquePath(dir, safeName(file.name));
    await fs.writeFile(target, buffer);

    // HEIC/HEIF → JPEG so both the browser and the analysis can read it.
    if (ext === ".heic" || ext === ".heif") {
      const jpgTarget = target.replace(/\.[^.]+$/, ".jpg");
      try {
        await execFileAsync("/usr/bin/sips", [
          "-s",
          "format",
          "jpeg",
          "-s",
          "formatOptions",
          "90",
          target,
          "--out",
          jpgTarget,
        ]);
        await fs.unlink(target); // keep only the converted copy
        saved.push(path.basename(jpgTarget));
      } catch {
        await fs.unlink(target).catch(() => {});
        errors.push(`${file.name}: HEIC conversion failed — please export as JPG and retry`);
      }
      continue;
    }

    if (isImage && !IMAGE_EXTS.has(ext)) {
      // Shouldn't happen (UPLOAD_IMAGE_EXTS minus HEIC == IMAGE_EXTS) but stay safe.
      await fs.unlink(target).catch(() => {});
      errors.push(`${file.name}: unsupported image type`);
      continue;
    }

    saved.push(path.basename(target));
  }

  return NextResponse.json({ saved, errors });
}

/**
 * Cloud upload for a DB-backed person. Images go to R2 (with a Photo row) when
 * configured; otherwise to local disk in dev (no Photo row — the analysis and
 * /api/photo both fall back to disk). HEIC isn't converted here (no macOS
 * `sips` in the cloud), so it's rejected with guidance.
 */
async function cloudUpload(personId: string, files: File[]) {
  const saved: string[] = [];
  const errors: string[] = [];
  const cloud = storageConfigured();
  const dir = resolvePersonDir(personId);

  for (const file of files) {
    const ext = path.extname(file.name).toLowerCase();
    const isImage = IMAGE_EXTS.has(ext); // jpg/png/webp only in the cloud
    const isVideo = VIDEO_EXTS.has(ext);

    if (ext === ".heic" || ext === ".heif") {
      errors.push(`${file.name}: please upload JPG or PNG (HEIC isn't supported online)`);
      continue;
    }
    if (!isImage && !isVideo) {
      errors.push(`${file.name}: unsupported type (photos: jpg/png/webp, video: mp4/mov/webm)`);
      continue;
    }
    if (file.size > (isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) {
      errors.push(`${file.name}: too large`);
      continue;
    }
    // Videos can't be analyzed server-side yet — accept images only in cloud.
    if (isVideo) {
      errors.push(`${file.name}: video isn't analyzed online yet — add photos instead`);
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = safeName(file.name);
    const contentType = contentTypeFor(ext);

    try {
      if (cloud) {
        const key = photoKey(personId, `${Date.now()}-${name}`);
        await putPhoto(key, buffer, contentType);
        await prisma.photo.create({
          data: {
            personId,
            r2Key: key,
            originalName: file.name.slice(0, 200),
            contentType,
            sizeBytes: buffer.byteLength,
          },
        });
        saved.push(name);
      } else if (dir) {
        await fs.mkdir(dir, { recursive: true });
        const target = await uniquePath(dir, name);
        await fs.writeFile(target, buffer);
        saved.push(path.basename(target));
      } else {
        errors.push(`${file.name}: no storage available`);
      }
    } catch {
      errors.push(`${file.name}: upload failed`);
    }
  }

  return NextResponse.json({ saved, errors });
}
