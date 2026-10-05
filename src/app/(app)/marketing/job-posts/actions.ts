// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use server";

import { prisma } from "@/lib/prisma";
import { requireNotInstaller } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { getDownloadUrl } from "@/lib/storage";
import { cloudinaryConfigured, uploadImageFromUrl } from "@/lib/cloudinary";
import { bufferConfigured, createDraftPost } from "@/lib/buffer";

export interface PostFormState {
  error?: string;
  done?: string;
}

/** Hosts the ticked photos on Cloudinary and creates one DRAFT per ticked Buffer channel. Nothing is published. */
export async function sendPostToBuffer(jobNumber: string, _prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const user = await requireNotInstaller();
  if (!bufferConfigured() || !cloudinaryConfigured()) return { error: "Buffer and Cloudinary aren't connected yet — see the setup note at the top of this page." };

  const caption = String(formData.get("caption") ?? "").trim();
  const fileIds = formData.getAll("fileId").map(String);
  const channelIds = formData.getAll("channelId").map(String);
  if (!caption) return { error: "Write or edit the caption first." };
  if (fileIds.length === 0) return { error: "Tick at least one photo." };
  if (fileIds.length > 10) return { error: "Choose 10 photos or fewer." };
  if (channelIds.length === 0) return { error: "Choose at least one Buffer channel." };
  if (formData.get("consent") !== "on") return { error: "Please confirm the customer is happy for the photos to be shared and none show identifiable people or the address." };

  // Only photos that really belong to this job.
  const files = await prisma.fileAsset.findMany({ where: { id: { in: fileIds }, jobNumber, fileType: "Photos", mimeType: { startsWith: "image/" } } });
  if (files.length !== fileIds.length) return { error: "One of the photos isn't on this job." };

  try {
    const urls: string[] = [];
    for (const f of files) urls.push(await uploadImageFromUrl(await getDownloadUrl(f.storageKey, f.fileName)));
    for (const channelId of channelIds) await createDraftPost(channelId, caption, urls);
  } catch (e) {
    console.error("[social] send to Buffer failed", e);
    return { error: e instanceof Error ? e.message : "Could not create the draft." };
  }

  await logAudit({ userId: user.id, action: "social_draft_created", entityType: "Job", entityId: jobNumber, metadata: { photos: files.length, channels: channelIds.length } });
  return { done: `Saved ${channelIds.length} draft${channelIds.length === 1 ? "" : "s"} to Buffer with ${files.length} photo${files.length === 1 ? "" : "s"} — review and approve them inside Buffer.` };
}
