"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { buildStorageKey, getUploadUrl, getDownloadUrl, deleteObject } from "@/lib/storage";

export const FILE_TYPES = ["Plan", "Photos", "Supplier Quote", "Site Measure", "Correspondence", "Other"] as const;

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50MB

export interface RequestUploadResult {
  error?: string;
  storageKey?: string;
  uploadUrl?: string;
}

/** Step 1: verify the job exists and the caller may upload to it, then hand back a short-lived R2 PUT URL. */
export async function requestUpload(
  jobNumber: string,
  fileName: string,
  mimeType: string,
  sizeBytes: number
): Promise<RequestUploadResult> {
  await requireUser();

  if (!jobNumber) return { error: "Select a job first." };
  if (!fileName) return { error: "No file selected." };
  if (sizeBytes > MAX_FILE_BYTES) return { error: "File is larger than 50MB." };

  const job = await prisma.job.findUnique({ where: { number: jobNumber } });
  if (!job) return { error: `Job ${jobNumber} not found.` };

  const storageKey = buildStorageKey(jobNumber, fileName);
  const uploadUrl = await getUploadUrl(storageKey, mimeType || "application/octet-stream");
  return { storageKey, uploadUrl };
}

export interface ConfirmUploadState {
  error?: string;
}

/** Step 2: called only after the browser's PUT to R2 succeeds — records the file's metadata. */
export async function confirmUpload(params: {
  jobNumber: string;
  storageKey: string;
  fileName: string;
  fileType: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<ConfirmUploadState> {
  const user = await requireUser();
  const { jobNumber, storageKey, fileName, fileType, mimeType, sizeBytes } = params;

  const job = await prisma.job.findUnique({ where: { number: jobNumber } });
  if (!job) return { error: `Job ${jobNumber} not found.` };

  await prisma.fileAsset.create({
    data: {
      jobNumber,
      storageKey,
      fileName,
      fileType: FILE_TYPES.includes(fileType as (typeof FILE_TYPES)[number]) ? fileType : "Other",
      mimeType: mimeType || "application/octet-stream",
      sizeBytes,
      uploadedById: user.id,
    },
  });

  await logAudit({ userId: user.id, action: "file_uploaded", entityType: "FileAsset", entityId: storageKey, metadata: { jobNumber, fileName } });
  revalidatePath("/files");
  return {};
}

export async function getFileDownloadUrl(fileId: string): Promise<{ url?: string; error?: string }> {
  const user = await requireUser();
  const file = await prisma.fileAsset.findUnique({ where: { id: fileId } });
  if (!file) return { error: "File not found." };

  const url = await getDownloadUrl(file.storageKey, file.fileName);
  await logAudit({ userId: user.id, action: "file_downloaded", entityType: "FileAsset", entityId: file.id, metadata: { jobNumber: file.jobNumber } });
  return { url };
}

export async function deleteFile(fileId: string) {
  const user = await requireUser();
  const file = await prisma.fileAsset.findUnique({ where: { id: fileId } });
  if (!file) return;

  await deleteObject(file.storageKey);
  await prisma.fileAsset.delete({ where: { id: fileId } });
  await logAudit({ userId: user.id, action: "file_deleted", entityType: "FileAsset", entityId: file.id, metadata: { jobNumber: file.jobNumber, fileName: file.fileName } });
  revalidatePath("/files");
}
