"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
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
  const user = await requireUser();

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
  const user = await requireUser();
  const assignedToId = String(formData.get("assignedToId") ?? "").trim() || null;

  const lead = await prisma.lead.update({ where: { id }, data: { assignedToId } });
  if (assignedToId) await alertAssignee(lead.reference, lead.title, user.id, assignedToId);

  await logAudit({ userId: user.id, action: "lead_reassigned", entityType: "Lead", entityId: id, metadata: { assignedToId } });
  revalidatePath("/leads");
}

export async function markLeadConverted(id: string) {
  const user = await requireUser();
  await prisma.lead.update({ where: { id }, data: { status: "Converted", convertedAt: new Date() } });
  await logAudit({ userId: user.id, action: "lead_converted", entityType: "Lead", entityId: id });
  revalidatePath("/leads");
}
