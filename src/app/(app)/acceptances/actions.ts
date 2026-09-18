"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export interface AcceptanceFormState {
  error?: string;
}

export async function createAcceptance(_prevState: AcceptanceFormState, formData: FormData): Promise<AcceptanceFormState> {
  const user = await requireUser();

  const jobNumber = String(formData.get("jobNumber") ?? "").trim();
  const acceptedBy = String(formData.get("acceptedBy") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!jobNumber) return { error: "Job number is required." };
  if (!acceptedBy) return { error: "Who accepted the quote is required." };

  const job = await prisma.job.findUnique({ where: { number: jobNumber } });
  if (!job) return { error: `Job ${jobNumber} not found.` };

  await prisma.acceptance.create({
    data: { jobNumber, acceptedBy, notes: notes || null, createdById: user.id },
  });

  await logAudit({ userId: user.id, action: "acceptance_created", entityType: "Acceptance", metadata: { jobNumber, acceptedBy } });
  revalidatePath("/acceptances");
  return {};
}
