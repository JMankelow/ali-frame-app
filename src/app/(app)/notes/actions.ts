"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireNotInstaller, requireUser } from "@/lib/session";
import { isInstallerProfile } from "@/lib/permissions";
import { sendPlainNotificationEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { buildGenericStorageKey, getUploadUrl } from "@/lib/storage";

export interface NoteFormState {
  error?: string;
}

// Photos (incl. iPhone HEIC) and everyday documents can be attached to a note.
const FILE_TYPES = [
  "image/png", "image/jpeg", "image/webp", "image/gif", "image/heic", "image/heif",
  "application/pdf", "text/plain", "text/csv",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
const MAX_FILE_BYTES = 15 * 1024 * 1024;

/** Step 1 of attaching a photo or file: hands back a short-lived URL the browser PUTs it to. */
export async function requestNoteImageUpload(fileName: string, mimeType: string, sizeBytes: number): Promise<{ error?: string; storageKey?: string; uploadUrl?: string }> {
  await requireUser();
  if (!FILE_TYPES.includes(mimeType)) return { error: "That file type can't be attached — use a photo, PDF, Word, Excel, PowerPoint, CSV or text file." };
  if (sizeBytes > MAX_FILE_BYTES) return { error: "That file is over 15 MB." };
  const storageKey = buildGenericStorageKey("notes", fileName || "photo.jpg");
  try {
    return { storageKey, uploadUrl: await getUploadUrl(storageKey, mimeType) };
  } catch (e) {
    console.error("[notes] file storage unavailable", e);
    return { error: `File storage problem — the file couldn't be attached. (Reason: ${e instanceof Error ? e.message.slice(0, 160) : "unknown"})` };
  }
}

export async function createNote(_prevState: NoteFormState, formData: FormData): Promise<NoteFormState> {
  const user = await requireUser();
  const field = isInstallerProfile(user);
  const text = String(formData.get("text") ?? "").trim();
  const assignedToId = String(formData.get("assignedToId") ?? "").trim();

  if (!text) return { error: "Write something before adding the note." };
  if (assignedToId) {
    const a = await prisma.user.findUnique({ where: { id: assignedToId }, select: { email: true } });
    const ok = field ? ["tanya@aliframe.co.nz", "tristam@aliframe.co.nz"] : ["jo@aliframe.co.nz", "tanya@aliframe.co.nz", "claude@aliframe.local"];
    if (!a || !ok.includes(a.email)) return { error: field ? "You can assign a note to Tanya or Tristam." : "Notes can only be assigned to Jo, Tanya or Claude." };
  }

  // Photos/files already uploaded straight to storage (see requestNoteImageUpload).
  let attachments: { storageKey: string; fileName: string; mimeType: string; sizeBytes: number }[] = [];
  try {
    const raw = JSON.parse(String(formData.get("attachments") ?? "[]"));
    if (Array.isArray(raw)) {
      attachments = raw
        .slice(0, 10)
        .map((a) => ({ storageKey: String(a?.storageKey ?? ""), fileName: String(a?.fileName ?? "photo.jpg").slice(0, 120), mimeType: String(a?.mimeType ?? ""), sizeBytes: Number(a?.sizeBytes) || 0 }))
        .filter((a) => (a.storageKey.startsWith("notes/") || /^db:[a-z0-9]+$/i.test(a.storageKey)) && FILE_TYPES.includes(a.mimeType));
      // Files kept in the database (backup route): make sure each one really exists and isn't already on another note.
      const dbKeys = attachments.filter((a) => a.storageKey.startsWith("db:")).map((a) => a.storageKey.slice(3));
      if (dbKeys.length) {
        const ok = new Set((await prisma.noteFileBlob.findMany({ where: { id: { in: dbKeys } }, select: { id: true } })).map((b) => b.id));
        const used = new Set((await prisma.noteAttachment.findMany({ where: { storageKey: { in: dbKeys.map((k) => "db:" + k) } }, select: { storageKey: true } })).map((a) => a.storageKey));
        attachments = attachments.filter((a) => !a.storageKey.startsWith("db:") || (ok.has(a.storageKey.slice(3)) && !used.has(a.storageKey)));
      }
    }
  } catch {
    /* ignore malformed attachment list */
  }

  await prisma.note.create({
    data: { text, authorId: user.id, assignedToId: assignedToId || null, attachments: { create: attachments } },
  });

  // A note from field staff pings the person it's assigned to straight away (email now; it also shows on their bell / My Tasks).
  if (field && assignedToId) {
    const to = await prisma.user.findUnique({ where: { id: assignedToId }, select: { email: true, name: true } });
    if (to) {
      await sendPlainNotificationEmail({ to: to.email, subject: `New note from ${user.name}`, text: `${user.name} left you a note:\n\n${text}\n\nOpen it in the app: My Tasks.`, replyTo: user.email }).catch((e) => console.error("[notes] alert email failed", e));
    }
  }

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
  const user = await requireUser();
  // Field staff may only tick off a task that was assigned to them.
  if (isInstallerProfile(user) && !(await prisma.note.findFirst({ where: { id, assignedToId: user.id }, select: { id: true } }))) return;
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
