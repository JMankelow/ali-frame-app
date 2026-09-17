"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export interface NoteFormState {
  error?: string;
}

export async function createNote(_prevState: NoteFormState, formData: FormData): Promise<NoteFormState> {
  const user = await requireUser();
  const text = String(formData.get("text") ?? "").trim();
  const assignedToId = String(formData.get("assignedToId") ?? "").trim();

  if (!text) return { error: "Write something before adding the note." };

  await prisma.note.create({
    data: { text, authorId: user.id, assignedToId: assignedToId || null },
  });

  await logAudit({ userId: user.id, action: "note_created", entityType: "Note" });
  revalidatePath("/notes");
  return {};
}

export async function resolveNote(id: string) {
  const user = await requireUser();
  await prisma.note.update({ where: { id }, data: { status: "Done", resolvedAt: new Date() } });
  await logAudit({ userId: user.id, action: "note_resolved", entityType: "Note", entityId: id });
  revalidatePath("/notes");
}

export async function reopenNote(id: string) {
  const user = await requireUser();
  await prisma.note.update({ where: { id }, data: { status: "Open", resolvedAt: null } });
  await logAudit({ userId: user.id, action: "note_reopened", entityType: "Note", entityId: id });
  revalidatePath("/notes");
}
