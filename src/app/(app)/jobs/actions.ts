"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export interface JobFormState {
  error?: string;
}

export async function createJob(_prevState: JobFormState, formData: FormData): Promise<JobFormState> {
  // Real, server-side check — every signed-in user can create a job for now;
  // tighten with requireRole(...) once role rules for Jobs are decided.
  const user = await requireUser();

  const number = String(formData.get("number") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const type = String(formData.get("type") ?? "RESIDENTIAL");
  const status = String(formData.get("status") ?? "New").trim() || "New";
  const supplier = String(formData.get("supplier") ?? "").trim();

  if (!number) return { error: "Job number is required." };
  if (!title) return { error: "Job title is required." };

  const existing = await prisma.job.findUnique({ where: { number } });
  if (existing) return { error: `Job ${number} already exists.` };

  await prisma.job.create({
    data: {
      number,
      title,
      address: address || null,
      type: type === "COMMERCIAL" ? "COMMERCIAL" : "RESIDENTIAL",
      status,
      supplier: supplier || null,
    },
  });

  await logAudit({ userId: user.id, action: "job_created", entityType: "Job", entityId: number });
  revalidatePath("/jobs");
  return {};
}

export async function archiveJob(number: string) {
  const user = await requireUser();
  await prisma.job.update({ where: { number }, data: { archived: true } });
  await logAudit({ userId: user.id, action: "job_archived", entityType: "Job", entityId: number });
  revalidatePath("/jobs");
}
