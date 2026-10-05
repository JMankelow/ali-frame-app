"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireNotInstaller } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { buildGenericStorageKey, getUploadUrl } from "@/lib/storage";

export interface NoteFormState {
  error?: string;
}

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Step 1 of attaching a screenshot: hands back a short-lived URL the browser PUTs the image to. */
export async function requestNoteImageUpload(fileName: string, mimeType: string, sizeBytes: number): Promise<{ error?: string; storageKey?: string; uploadUrl?: string }> {
  await requireNotInstaller();
  if (!IMAGE_TYPES.includes(mimeType)) return { error: "Only PNG, JPG, WebP or GIF images can be attached." };
  if (sizeBytes > MAX_IMAGE_BYTES) return { error: "That image is over 10 MB." };
  const storageKey = buildGenericStorageKey("notes", fileName || "screenshot.png");
  try {
    return { storageKey, uploadUrl: await getUploadUrl(storageKey, mimeType) };
  } catch (e) {
    console.error("[notes] file storage unavailable", e);
    return { error: `File storage problem — the image couldn't be attached. (Reason: ${e instanceof Error ? e.message.slice(0, 160) : "unknown"})` };
  }
}

export async function createNote(_prevState: NoteFormState, formData: FormData): Promise<NoteFormState> {
  const user = await requireNotInstaller();
  const text = String(formData.get("text") ?? "").trim();
  const assignedToId = String(formData.get("assignedToId") ?? "").trim();

  if (!text) return { error: "Write something before adding the note." };

  // Screenshots already uploaded straight to storage (see requestNoteImageUpload).
  let attachments: { storageKey: string; fileName: string; mimeType: string; sizeBytes: number }[] = [];
  try {
    const raw = JSON.parse(String(formData.get("attachments") ?? "[]"));
    if (Array.isArray(raw)) {
      attachments = raw
        .slice(0, 10)
        .map((a) => ({ storageKey: String(a?.storageKey ?? ""), fileName: String(a?.fileName ?? "screenshot.png").slice(0, 120), mimeType: String(a?.mimeType ?? ""), sizeBytes: Number(a?.sizeBytes) || 0 }))
        .filter((a) => a.storageKey.startsWith("notes/") && IMAGE_TYPES.includes(a.mimeType));
    }
  } catch {
    /* ignore malformed attachment list */
  }

  await prisma.note.create({
    data: { text, authorId: user.id, assignedToId: assignedToId || null, attachments: { create: attachments } },
  });

  await logAudit({ userId: user.id, action: "note_created", entityType: "Note" });
  revalidatePath("/notes");
  revalidatePath("/users");
  return {};
}

export async function updateNoteText(id: string, _prevState: NoteFormState, formData: FormData): Promise<NoteFormState> {
  const user = await requireNotInstaller();
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return { error: "Task text can't be empty." };

  await prisma.note.update({ where: { id }, data: { text } });
  await logAudit({ userId: user.id, action: "note_edited", entityType: "Note", entityId: id });
  revalidatePath("/notes");
  revalidatePath("/tasks");
  revalidatePath("/users");
  return {};
}

export async function resolveNote(id: string) {
  const user = await requireNotInstaller();
  await prisma.note.update({ where: { id }, data: { status: "Done", resolvedAt: new Date() } });
  await logAudit({ userId: user.id, action: "note_resolved", entityType: "Note", entityId: id });
  revalidatePath("/notes");
  revalidatePath("/tasks");
  revalidatePath("/users");
}

/**
 * Used when the assignee is the Claude pseudo-user: rather than closing the
 * task, hands it back to whoever created it so they can check the work
 * before it's really Done.
 */
export async function completeAndReturnToCreator(id: string) {
  const user = await requireNotInstaller();
  const note = await prisma.note.findUnique({ where: { id } });
  if (!note) return;

  await prisma.note.update({
    where: { id },
    data: { assignedToId: note.authorId, status: "Open" },
  });
  await logAudit({ userId: user.id, action: "note_returned_to_creator", entityType: "Note", entityId: id });
  revalidatePath("/notes");
  revalidatePath("/tasks");
}

export async function reopenNote(id: string) {
  const user = await requireNotInstaller();
  await prisma.note.update({ where: { id }, data: { status: "Open", resolvedAt: null } });
  await logAudit({ userId: user.id, action: "note_reopened", entityType: "Note", entityId: id });
  revalidatePath("/notes");
}
