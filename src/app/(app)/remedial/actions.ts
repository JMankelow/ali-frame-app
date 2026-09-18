"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export interface RemedialFormState {
  error?: string;
}

export async function createRemedialItem(_prevState: RemedialFormState, formData: FormData): Promise<RemedialFormState> {
  const user = await requireUser();

  const jobNumber = String(formData.get("jobNumber") ?? "").trim();
  const issue = String(formData.get("issue") ?? "").trim();
  const priority = String(formData.get("priority") ?? "Normal");
  const assignedToId = String(formData.get("assignedToId") ?? "").trim();

  if (!jobNumber) return { error: "Job number is required." };
  if (!issue) return { error: "Describe the issue." };

  const job = await prisma.job.findUnique({ where: { number: jobNumber } });
  if (!job) return { error: `Job ${jobNumber} not found.` };

  await prisma.remedialItem.create({
    data: { jobNumber, issue, priority, raisedById: user.id, assignedToId: assignedToId || null },
  });

  await logAudit({ userId: user.id, action: "remedial_created", entityType: "RemedialItem", metadata: { jobNumber, priority } });
  revalidatePath("/remedial");
  return {};
}

export async function resolveRemedialItem(id: string) {
  const user = await requireUser();
  await prisma.remedialItem.update({ where: { id }, data: { status: "Resolved", resolvedAt: new Date() } });
  await logAudit({ userId: user.id, action: "remedial_resolved", entityType: "RemedialItem", entityId: id });
  revalidatePath("/remedial");
}
