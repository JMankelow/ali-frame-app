"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireNotInstaller } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export interface LeadFormState {
  error?: string;
}

async function alertAssignee(leadReference: string, leadTitle: string, authorId: string, assignedToId: string) {
  await prisma.note.create({
    data: {
      authorId,
      assignedToId,
      text: `New lead assigned to you: ${leadReference} — ${leadTitle}. Please review and prepare a quote.`,
    },
  });
}

export async function createLead(_prevState: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const user = await requireNotInstaller();

  const reference = String(formData.get("reference") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const assignedToId = String(formData.get("assignedToId") ?? "").trim() || null;

  if (!reference) return { error: "Lead reference is required." };
  if (!title) return { error: "Lead title is required." };

  const existing = await prisma.lead.findUnique({ where: { reference } });
  if (existing) return { error: `Lead ${reference} already exists.` };

  await prisma.lead.create({
    data: { reference, title, source: source || null, description: description || null, assignedToId },
  });

  if (assignedToId) await alertAssignee(reference, title, user.id, assignedToId);

  await logAudit({ userId: user.id, action: "lead_created", entityType: "Lead", entityId: reference, metadata: { assignedToId } });
  revalidatePath("/leads");
  return {};
}

export async function reassignLead(id: string, formData: FormData) {
  const user = await requireNotInstaller();
  const assignedToId = String(formData.get("assignedToId") ?? "").trim() || null;

  const lead = await prisma.lead.update({ where: { id }, data: { assignedToId } });
  if (assignedToId) await alertAssignee(lead.reference, lead.title, user.id, assignedToId);

  await logAudit({ userId: user.id, action: "lead_reassigned", entityType: "Lead", entityId: id, metadata: { assignedToId } });
  revalidatePath("/leads");
}

export async function markLeadConverted(id: string) {
  const user = await requireNotInstaller();
  await prisma.lead.update({ where: { id }, data: { status: "Converted", convertedAt: new Date() } });
  await logAudit({ userId: user.id, action: "lead_converted", entityType: "Lead", entityId: id });
  revalidatePath("/leads");
}

// ---------- Import leads from an uploaded file (.csv / .xlsx / saved email .eml) ----------

export interface LeadPreviewRow {
  title: string;
  source: string;
  description: string;
  duplicate: boolean;
}
export interface LeadUploadState {
  error?: string;
  rows?: LeadPreviewRow[];
  fileName?: string;
}

export async function parseLeadUpload(_prev: LeadUploadState, formData: FormData): Promise<LeadUploadState> {
  await requireNotInstaller();
  const { parseLeadFile, MAX_LEAD_FILE_BYTES } = await import("@/lib/leadImport");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file first." };
  if (file.size > MAX_LEAD_FILE_BYTES) return { error: "That file is too big (2 MB maximum)." };
  try {
    const parsed = parseLeadFile(file.name, new Uint8Array(await file.arrayBuffer()));
    if (parsed.length === 0) return { error: "No leads found in that file." };
    const existing = new Set((await prisma.lead.findMany({ select: { title: true } })).map((l) => l.title.trim().toLowerCase()));
    return { fileName: file.name, rows: parsed.map((p) => ({ ...p, duplicate: existing.has(p.title.trim().toLowerCase()) })) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't read that file." };
  }
}

export async function importLeads(rows: { title: string; source: string; description: string }[], assignedToId: string): Promise<{ error?: string; created?: number }> {
  const user = await requireNotInstaller();
  if (!Array.isArray(rows) || rows.length === 0) return { error: "Tick at least one lead to import." };
  if (rows.length > 500) return { error: "Import 500 leads or fewer at a time." };
  const assignee = assignedToId || null;

  // Next free LEAD-n reference.
  const refs = await prisma.lead.findMany({ where: { reference: { startsWith: "LEAD-" } }, select: { reference: true } });
  let next = Math.max(2049, ...refs.map((r) => Number(r.reference.replace("LEAD-", "")) || 0)) + 1;

  let created = 0;
  for (const r of rows) {
    const title = String(r.title ?? "").trim().slice(0, 160);
    if (!title) continue;
    const reference = `LEAD-${next++}`;
    await prisma.lead.create({
      data: { reference, title, source: String(r.source ?? "").trim().slice(0, 80) || null, description: String(r.description ?? "").trim().slice(0, 4000) || null, assignedToId: assignee },
    });
    if (assignee) await alertAssignee(reference, title, user.id, assignee);
    created++;
  }
  await logAudit({ userId: user.id, action: "leads_imported", entityType: "Lead", metadata: { count: created, assignedToId: assignee } });
  revalidatePath("/leads");
  return { created };
}
