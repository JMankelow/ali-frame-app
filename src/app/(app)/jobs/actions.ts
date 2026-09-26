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

export interface JobEditState {
  error?: string;
}

export async function updateJobDetails(number: string, _prevState: JobEditState, formData: FormData): Promise<JobEditState> {
  const user = await requireUser();

  const clientName = String(formData.get("clientName") ?? "").trim();
  const clientPhone = String(formData.get("clientPhone") ?? "").trim();
  const clientEmail = String(formData.get("clientEmail") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const type = String(formData.get("type") ?? "RESIDENTIAL") === "COMMERCIAL" ? "COMMERCIAL" : "RESIDENTIAL";
  const supplier = String(formData.get("supplier") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const assignedUserId = String(formData.get("assignedUserId") ?? "").trim();
  const startDateRaw = String(formData.get("startDate") ?? "").trim();

  if (!clientName) return { error: "Customer name is required." };
  if (!status) return { error: "Status is required." };

  const job = await prisma.job.findUnique({ where: { number }, include: { client: true } });
  if (!job) return { error: `Job ${number} not found.` };

  let clientId = job.clientId;
  if (job.client) {
    await prisma.client.update({
      where: { id: job.client.id },
      data: { name: clientName, phone: clientPhone || null, email: clientEmail || null },
    });
  } else {
    const created = await prisma.client.create({
      data: { name: clientName, phone: clientPhone || null, email: clientEmail || null, address: address || null },
    });
    clientId = created.id;
  }

  await prisma.job.update({
    where: { number },
    data: {
      title: clientName,
      clientId,
      status,
      type,
      supplier: supplier || null,
      address: address || null,
      phone: clientPhone || null,
      email: clientEmail || null,
      assignedUserId: assignedUserId || null,
      startDate: startDateRaw ? new Date(startDateRaw) : null,
    },
  });

  await logAudit({ userId: user.id, action: "job_updated", entityType: "Job", entityId: number });
  revalidatePath(`/jobs/${number}`);
  revalidatePath("/jobs");
  return {};
}

export async function archiveJob(number: string) {
  const user = await requireUser();
  await prisma.job.update({ where: { number }, data: { archived: true } });
  await logAudit({ userId: user.id, action: "job_archived", entityType: "Job", entityId: number });
  revalidatePath("/jobs");
}

export async function reactivateJob(number: string) {
  const user = await requireUser();
  await prisma.job.update({ where: { number }, data: { archived: false } });
  await logAudit({ userId: user.id, action: "job_reactivated", entityType: "Job", entityId: number });
  revalidatePath("/jobs");
}
