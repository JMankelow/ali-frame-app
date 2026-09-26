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

  if (!clientName) return { error: "Customer name is required." };
  if (!status) return { error: "Status is required." };

  const job = await prisma.job.findUnique({ where: { number }, include: { client: true } });
  if (!job) return { error: `Job ${number} not found.` };

  // Acceptances are never entered by hand — the moment Sales moves a job's
  // status to "Accepted" we log it automatically, and the job then sits in
  // the Acceptances queue (see acceptances/page.tsx) until Sales books the
  // Check Measure, which is what actually clears it from that queue.
  if (status === "Accepted" && job.status !== "Accepted") {
    const alreadyLogged = await prisma.acceptance.findFirst({ where: { jobNumber: number } });
    if (!alreadyLogged) {
      await prisma.acceptance.create({
        data: { jobNumber: number, acceptedBy: clientName, notes: "Auto-recorded on status change to Accepted", createdById: user.id },
      });
    }
  }

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
    },
  });

  await logAudit({
    userId: user.id,
    action: "job_updated",
    entityType: "Job",
    entityId: number,
    metadata: status !== job.status ? { statusFrom: job.status, statusTo: status } : undefined,
  });
  revalidatePath(`/jobs/${number}`);
  revalidatePath("/jobs");
  revalidatePath("/calendar");
  return {};
}

export interface JobNoteState {
  error?: string;
}

export async function createJobNote(jobNumber: string, _prevState: JobNoteState, formData: FormData): Promise<JobNoteState> {
  const user = await requireUser();
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return { error: "Note text is required." };

  await prisma.note.create({ data: { text, authorId: user.id, jobNumber } });
  await logAudit({ userId: user.id, action: "note_added", entityType: "Job", entityId: jobNumber });
  revalidatePath(`/jobs/${jobNumber}`);
  return {};
}

export interface ScheduledTaskState {
  error?: string;
}

const TASK_TYPES = ["Sales Measure", "Check Measure", "Installation", "Remedial"];

export async function createScheduledTask(
  jobNumber: string,
  _prevState: ScheduledTaskState,
  formData: FormData
): Promise<ScheduledTaskState> {
  const user = await requireUser();

  const type = String(formData.get("type") ?? "").trim();
  const scheduledDateRaw = String(formData.get("scheduledDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const assigneeIds = formData.getAll("assigneeIds").map((v) => String(v)).filter(Boolean);

  if (!TASK_TYPES.includes(type)) return { error: "Pick a valid booking type." };
  if (!scheduledDateRaw) return { error: "A date is required." };

  const task = await prisma.jobScheduledTask.create({
    data: {
      jobNumber,
      type,
      scheduledDate: new Date(scheduledDateRaw),
      notes: notes || null,
      createdById: user.id,
      assignees: { connect: assigneeIds.map((id) => ({ id })) },
    },
    include: { assignees: true },
  });

  await logAudit({
    userId: user.id,
    action: "scheduled_task_created",
    entityType: "Job",
    entityId: jobNumber,
    metadata: { type, scheduledDate: task.scheduledDate, assignees: task.assignees.map((a) => a.name) },
  });
  revalidatePath(`/jobs/${jobNumber}`);
  revalidatePath("/calendar");
  return {};
}

export async function updateScheduledTask(
  id: string,
  _prevState: ScheduledTaskState,
  formData: FormData
): Promise<ScheduledTaskState> {
  const user = await requireUser();

  const existing = await prisma.jobScheduledTask.findUnique({ where: { id } });
  if (!existing) return { error: "Booking not found." };

  const type = String(formData.get("type") ?? "").trim();
  const scheduledDateRaw = String(formData.get("scheduledDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() || "Scheduled";
  const assigneeIds = formData.getAll("assigneeIds").map((v) => String(v)).filter(Boolean);

  if (!TASK_TYPES.includes(type)) return { error: "Pick a valid booking type." };
  if (!scheduledDateRaw) return { error: "A date is required." };

  await prisma.jobScheduledTask.update({
    where: { id },
    data: {
      type,
      scheduledDate: new Date(scheduledDateRaw),
      notes: notes || null,
      status,
      completedAt: status === "Completed" ? new Date() : null,
      assignees: { set: assigneeIds.map((aid) => ({ id: aid })) },
    },
  });

  await logAudit({
    userId: user.id,
    action: "scheduled_task_updated",
    entityType: "Job",
    entityId: existing.jobNumber,
    metadata: { type, scheduledDate: scheduledDateRaw, status },
  });
  revalidatePath(`/jobs/${existing.jobNumber}`);
  revalidatePath("/calendar");
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
