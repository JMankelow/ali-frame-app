"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperUser, requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { buildGenericStorageKey, getUploadUrl, getDownloadUrl, deleteObject } from "@/lib/storage";

export interface EmployeeFormState {
  error?: string;
}

export async function updateEmployeeDetails(
  userId: string,
  _prevState: EmployeeFormState,
  formData: FormData
): Promise<EmployeeFormState> {
  const actor = await requireSuperUser();

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!name) return { error: "Name is required." };

  await prisma.user.update({ where: { id: userId }, data: { name, phone: phone || null } });
  await logAudit({ userId: actor.id, action: "employee_details_updated", entityType: "User", entityId: userId });
  revalidatePath(`/employees/${userId}`);
  revalidatePath("/employees");
  return {};
}

export interface RequestDocUploadResult {
  error?: string;
  storageKey?: string;
  uploadUrl?: string;
}

const MAX_FILE_BYTES = 25 * 1024 * 1024;

export async function requestEmployeeDocUpload(
  userId: string,
  fileName: string,
  mimeType: string,
  sizeBytes: number
): Promise<RequestDocUploadResult> {
  await requireUser();
  if (sizeBytes > MAX_FILE_BYTES) return { error: "File is larger than 25MB." };

  const storageKey = buildGenericStorageKey(`employees/${userId}`, fileName);
  const uploadUrl = await getUploadUrl(storageKey, mimeType || "application/octet-stream");
  return { storageKey, uploadUrl };
}

export async function confirmEmployeeDocUpload(params: {
  userId: string;
  storageKey: string;
  fileName: string;
  docType: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<EmployeeFormState> {
  const user = await requireUser();
  const { userId, storageKey, fileName, docType, mimeType, sizeBytes } = params;

  await prisma.employeeDocument.create({
    data: { userId, storageKey, fileName, docType, mimeType, sizeBytes, uploadedById: user.id },
  });

  await logAudit({ userId: user.id, action: "employee_document_uploaded", entityType: "User", entityId: userId, metadata: { fileName } });
  revalidatePath(`/employees/${userId}`);
  return {};
}

export async function getEmployeeDocDownloadUrl(docId: string): Promise<{ url?: string; error?: string }> {
  await requireUser();
  const doc = await prisma.employeeDocument.findUnique({ where: { id: docId } });
  if (!doc) return { error: "Document not found." };
  const url = await getDownloadUrl(doc.storageKey, doc.fileName);
  return { url };
}

export async function deleteEmployeeDoc(docId: string) {
  const user = await requireSuperUser();
  const doc = await prisma.employeeDocument.findUnique({ where: { id: docId } });
  if (!doc) return;

  await deleteObject(doc.storageKey);
  await prisma.employeeDocument.delete({ where: { id: docId } });
  await logAudit({ userId: user.id, action: "employee_document_deleted", entityType: "User", entityId: doc.userId, metadata: { fileName: doc.fileName } });
  revalidatePath(`/employees/${doc.userId}`);
}
