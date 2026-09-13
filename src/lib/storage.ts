import "server-only";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | null = null;

function getClient(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY must be set");
  }
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return client;
}

function getBucket(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME is not set");
  return bucket;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

/** Builds a storage key namespaced by job so files are easy to reason about in the bucket browser. */
export function buildStorageKey(jobNumber: string, fileName: string): string {
  return `jobs/${jobNumber}/${randomUUID()}-${sanitizeFileName(fileName)}`;
}

/** Short-lived URL the browser can PUT the file bytes to directly — the file never passes through our server. */
export async function getUploadUrl(storageKey: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({ Bucket: getBucket(), Key: storageKey, ContentType: contentType });
  return getSignedUrl(getClient(), command, { expiresIn: 300 });
}

/** Short-lived URL to download/view the file — generated fresh per request, only after the caller's access is checked. */
export async function getDownloadUrl(storageKey: string, fileName: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: storageKey,
    ResponseContentDisposition: `attachment; filename="${sanitizeFileName(fileName)}"`,
  });
  return getSignedUrl(getClient(), command, { expiresIn: 300 });
}

export async function deleteObject(storageKey: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: storageKey }));
}

/** Reads an object's bytes server-side — used to attach a just-uploaded file to an outgoing email. */
export async function getObjectBuffer(storageKey: string): Promise<Buffer> {
  const result = await getClient().send(new GetObjectCommand({ Bucket: getBucket(), Key: storageKey }));
  const body = result.Body;
  if (!body) throw new Error(`No body returned for ${storageKey}`);
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
