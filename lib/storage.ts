import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { R2, storageConfigured } from "./env";
import { prisma } from "./db";

/**
 * Photo storage with two interchangeable backends behind one interface:
 *
 *  - **R2** (Cloudflare, S3-compatible) when R2_* is configured.
 *  - **Postgres** (the PhotoBlob table) otherwise — so photos live in shared
 *    storage that BOTH the web service and the separate analysis worker can
 *    reach over the DB connection they already have. (A Railway volume is
 *    attached to a single service, so it can't back a separate worker.)
 *
 * Keys are `people/<personId>/<filename>` either way — the same value stored in
 * Photo.r2Key, in a person's `photos[]`, and resolved by /api/photo. Swap
 * backends by setting R2_*; no caller changes.
 */

let client: S3Client | null = null;

function r2(): S3Client {
  if (!storageConfigured()) {
    throw new Error("R2 is not configured");
  }
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${R2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2.accessKeyId,
        secretAccessKey: R2.secretAccessKey,
      },
    });
  }
  return client;
}

/** Build the object key for a person's photo. */
export function photoKey(personId: string, filename: string): string {
  return `people/${personId}/${filename}`;
}

/** Upload one photo (R2 when configured, else Postgres). Returns the stored key. */
export async function putPhoto(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  if (storageConfigured()) {
    await r2().send(
      new PutObjectCommand({
        Bucket: R2.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
    return key;
  }
  await prisma.photoBlob.upsert({
    where: { key },
    create: { key, data: body, contentType },
    update: { data: body, contentType },
  });
  return key;
}

/** Fetch one photo's bytes + content type, or null if it isn't stored. */
export async function getPhoto(
  key: string
): Promise<{ body: Uint8Array; contentType: string } | null> {
  if (storageConfigured()) {
    try {
      const res = await r2().send(
        new GetObjectCommand({ Bucket: R2.bucket, Key: key })
      );
      if (!res.Body) return null;
      const bytes = await res.Body.transformToByteArray();
      return {
        body: bytes,
        contentType: res.ContentType ?? "application/octet-stream",
      };
    } catch {
      return null;
    }
  }
  const blob = await prisma.photoBlob.findUnique({ where: { key } });
  if (!blob) return null;
  return { body: new Uint8Array(blob.data), contentType: blob.contentType };
}

/** Delete every stored object under a person's prefix (on person/account removal). */
export async function deletePersonPhotos(personId: string): Promise<void> {
  const prefix = `people/${personId}/`;
  if (storageConfigured()) {
    const listed = await r2().send(
      new ListObjectsV2Command({ Bucket: R2.bucket, Prefix: prefix })
    );
    const keys = (listed.Contents ?? [])
      .map((o) => o.Key)
      .filter((k): k is string => Boolean(k));
    if (keys.length === 0) return;
    await r2().send(
      new DeleteObjectsCommand({
        Bucket: R2.bucket,
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      })
    );
    return;
  }
  await prisma.photoBlob.deleteMany({ where: { key: { startsWith: prefix } } });
}

export { storageConfigured };
