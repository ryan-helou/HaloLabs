import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isUnlocked } from "@/lib/entitlement";
import { putPhoto, storageConfigured } from "@/lib/storage";
import { checkinKey } from "@/lib/checkins";
import { IMAGE_EXTS, contentTypeFor, resolvePersonDir } from "@/lib/paths";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 40 * 1024 * 1024;

/** Sanitize an uploaded filename to a safe basename (keeps its extension). */
function safeName(original: string): string {
  const ext = path.extname(original).toLowerCase();
  const stem = path
    .basename(original, path.extname(original))
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 60);
  return `${stem || "photo"}${ext}`;
}

/**
 * Add a progress check-in: a batch of new photos, stored under this person's
 * `progress/<ts>/` prefix so they group by day and never touch the baseline
 * analysis photos. Members only — progress tracking is part of the plan.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id);

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }
  const person = await prisma.person.findFirst({
    where: { userId: session.user.id, id },
  });
  if (!person) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!(await isUnlocked())) {
    return NextResponse.json({ error: "Membership required." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form" }, { status: 400 });
  }
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "Add at least one photo." }, { status: 400 });
  }

  const ts = Date.now();
  const cloud = storageConfigured();
  const dir = resolvePersonDir(id);
  const saved: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < files.length && i < 8; i++) {
    const file = files[i];
    const ext = path.extname(file.name).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) {
      errors.push(`${file.name}: use JPG, PNG, or WebP`);
      continue;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      errors.push(`${file.name}: too large`);
      continue;
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const name = `${String(i + 1).padStart(2, "0")}-${safeName(file.name)}`;
    try {
      if (cloud) {
        const key = checkinKey(id, ts, name);
        await putPhoto(key, buffer, contentTypeFor(ext));
        await prisma.photo.create({
          data: {
            personId: id,
            r2Key: key,
            originalName: file.name.slice(0, 200),
            contentType: contentTypeFor(ext),
            sizeBytes: buffer.byteLength,
          },
        });
        saved.push(name);
      } else if (dir) {
        const target = path.join(dir, "progress", String(ts));
        await fs.mkdir(target, { recursive: true });
        await fs.writeFile(path.join(target, name), buffer);
        saved.push(name);
      } else {
        errors.push(`${file.name}: no storage available`);
      }
    } catch {
      errors.push(`${file.name}: upload failed`);
    }
  }

  if (saved.length === 0) {
    return NextResponse.json({ error: errors[0] ?? "Upload failed." }, { status: 400 });
  }
  return NextResponse.json({ saved, ts, errors });
}
