// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { buildGenericStorageKey, getUploadUrl } from "@/lib/storage";

const MAX_BYTES = 15 * 1024 * 1024;

export async function requestPolicyUpload(fileName: string, mimeType: string, sizeBytes: number): Promise<{ error?: string; storageKey?: string; uploadUrl?: string }> {
  await requireSuperUser();
  if (mimeType !== "application/pdf" || !fileName.toLowerCase().endsWith(".pdf")) return { error: "Only PDF files can be added." };
  if (sizeBytes > MAX_BYTES) return { error: "File is larger than 15MB." };
  const storageKey = buildGenericStorageKey("policies", fileName);
  return { storageKey, uploadUrl: await getUploadUrl(storageKey, "application/pdf") };
}

export async function confirmPolicyUpload(params: { title: string; category: string; storageKey: string; fileName: string; sizeBytes: number }): Promise<{ error?: string }> {
  const user = await requireSuperUser();
  const title = params.title.trim();
  const category = params.category.trim();
  if (!title || !category) return { error: "Enter a title and category." };
  if (!params.storageKey.startsWith("policies/")) return { error: "Invalid upload." };
  const last = await prisma.companyPolicy.findFirst({ where: { category }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  const created = await prisma.companyPolicy.create({
    data: { title, category, fileName: params.fileName, storageKey: params.storageKey, sizeBytes: params.sizeBytes, sortOrder: (last?.sortOrder ?? 0) + 1, uploadedById: user.id },
  });
  await logAudit({ userId: user.id, action: "company_policy_added", entityType: "CompanyPolicy", entityId: created.id, metadata: { title } });
  revalidatePath("/policies");
  return {};
}

/** Archive, never hard-delete (standing rule) — the PDF stays in storage. */
export async function archivePolicy(id: string) {
  const user = await requireSuperUser();
  await prisma.companyPolicy.update({ where: { id }, data: { active: false } });
  await logAudit({ userId: user.id, action: "company_policy_archived", entityType: "CompanyPolicy", entityId: id });
  revalidatePath("/policies");
}
