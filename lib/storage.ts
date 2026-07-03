import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { R2, storageConfigured } from "./env";

/**
 * Cloudflare R2 photo storage (S3-compatible). Photos leave the device here,
 * so this is only used in cloud mode; when R2 isn't configured, callers fall
 * back to local disk (lib/paths + /api/photo).
 *
 * Keys are `people/<personId>/<filename>`, which is also what the viewer stores
 * in a person's `photos[]` and what /api/photo resolves.
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

/** Upload one photo. Returns the stored key. */
export async function putPhoto(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
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

/** Fetch one photo's bytes + content type, or null if it isn't in R2. */
export async function getPhoto(
  key: string
): Promise<{ body: Uint8Array; contentType: string } | null> {
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

/** Delete every object under a person's prefix (used when a person is removed). */
export async function deletePersonPhotos(personId: string): Promise<void> {
  if (!storageConfigured()) return;
  const prefix = `people/${personId}/`;
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
}

export { storageConfigured };
