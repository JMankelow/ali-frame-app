"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperUser, requireNotInstaller } from "@/lib/session";
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
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!name) return { error: "Name is required." };
  if (!email || !email.includes("@")) return { error: "Enter a valid email address." };

  const clash = await prisma.user.findFirst({ where: { email, NOT: { id: userId } } });
  if (clash) return { error: "Another account already uses that email address." };

  const personalEmail = String(formData.get("personalEmail") ?? "").trim().toLowerCase();
  if (personalEmail && !personalEmail.includes("@")) return { error: "Enter a valid personal email address." };
  const inviteTo = formData.get("inviteTo") === "personal" ? "personal" : "work";
  if (inviteTo === "personal" && !personalEmail) return { error: "Add a personal email before choosing to send invites there." };
  const optDate = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v ? new Date(v) : null;
  };
  const optText = (k: string) => String(formData.get(k) ?? "").trim() || null;

  await prisma.user.update({ where: { id: userId }, data: { name, phone: phone || null, email } });
  const detail = {
    preferredName: optText("preferredName"),
    personalEmail: personalEmail || null,
    address: optText("address"),
    jobTitle: optText("jobTitle"),
    startDate: optDate("startDate"),
    finishDate: optDate("finishDate"),
    inviteTo,
  };
  await prisma.employeeDetail.upsert({ where: { userId }, create: { userId, ...detail }, update: detail });
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
  await requireNotInstaller();
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
  const user = await requireNotInstaller();
  const { userId, storageKey, fileName, docType, mimeType, sizeBytes } = params;

  await prisma.employeeDocument.create({
    data: { userId, storageKey, fileName, docType, mimeType, sizeBytes, uploadedById: user.id },
  });

  await logAudit({ userId: user.id, action: "employee_document_uploaded", entityType: "User", entityId: userId, metadata: { fileName } });
  revalidatePath(`/employees/${userId}`);
  return {};
}

export async function getEmployeeDocDownloadUrl(docId: string): Promise<{ url?: string; error?: string }> {
  await requireNotInstaller();
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
