"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireNotInstaller } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { sendPlainNotificationEmail } from "@/lib/email";

export interface JobFormState {
  error?: string;
}

export async function createJob(_prevState: JobFormState, formData: FormData): Promise<JobFormState> {
  // Real, server-side check — every signed-in user can create a job for now;
  // tighten with requireRole(...) once role rules for Jobs are decided.
  const user = await requireNotInstaller();

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
  const user = await requireNotInstaller();

  const clientName = String(formData.get("clientName") ?? "").trim();
  const clientPhone = String(formData.get("clientPhone") ?? "").trim();
  const clientEmail = String(formData.get("clientEmail") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const type = String(formData.get("type") ?? "RESIDENTIAL") === "COMMERCIAL" ? "COMMERCIAL" : "RESIDENTIAL";
  const supplier = String(formData.get("supplier") ?? "").trim();
  const priceType = String(formData.get("priceType") ?? "").trim();
  const leadSource = String(formData.get("leadSource") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const assignedUserId = String(formData.get("assignedUserId") ?? "").trim();
  const installDaysRaw = String(formData.get("installDays") ?? "").trim();
  const installDays = installDaysRaw ? parseFloat(installDaysRaw) : null;

  if (!clientName) return { error: "Customer name is required." };
  if (!status) return { error: "Status is required." };

  const job = await prisma.job.findUnique({ where: { number }, include: { client: true } });
  if (!job) return { error: `Job ${number} not found.` };

  if (installDays != null && (!Number.isFinite(installDays) || installDays <= 0 || installDays > 60)) {
    return { error: "Install days must be a number between 0.5 and 60." };
  }
  // Accepting a job means it needs to go on the Calendar, so we need to know for how long.
  if (status === "Quote Accepted" && job.status !== "Quote Accepted" && !(installDays ?? job.installDays)) {
    return { error: "How many install days does this job need? Enter it before marking the quote accepted." };
  }

  // Acceptances are never entered by hand — the moment Sales moves a job's
  // status to "Quote Accepted" we log it automatically, and the job then
  // sits in the Acceptances queue (see acceptances/page.tsx) until Sales
  // books the Check Measure, which is what actually clears it from that queue.
  if (status === "Quote Accepted" && job.status !== "Quote Accepted") {
    const alreadyLogged = await prisma.acceptance.findFirst({ where: { jobNumber: number } });
    if (!alreadyLogged) {
      await prisma.acceptance.create({
        data: { jobNumber: number, acceptedBy: clientName, notes: "Auto-recorded on status change to Accepted", createdById: user.id },
      });
    }
  }

  // Same idea for Remedial — nothing raised by hand, Sales/Ops just changes
  // the job's status to "Remedial Work Required" and a remedial item appears
  // on the Remedial queue automatically.
  if (status === "Remedial Work Required" && job.status !== "Remedial Work Required") {
    const alreadyOpen = await prisma.remedialItem.findFirst({ where: { jobNumber: number, status: "Open" } });
    if (!alreadyOpen) {
      await prisma.remedialItem.create({
        data: {
          jobNumber: number,
          issue: "Auto-raised on status change to Remedial Work Required — add details.",
          raisedById: user.id,
        },
      });
      await logAudit({ userId: user.id, action: "remedial_auto_raised", entityType: "Job", entityId: number });
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
      installDays: installDays ?? null,
      priceType: priceType || null,
      leadSource: leadSource || null,
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
  const user = await requireNotInstaller();

  const type = String(formData.get("type") ?? "").trim();
  const scheduledDateRaw = String(formData.get("scheduledDate") ?? "").trim();
  const endDateRaw = String(formData.get("endDate") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() || "Floating";
  const notes = String(formData.get("notes") ?? "").trim();
  const assigneeIds = formData.getAll("assigneeIds").map((v) => String(v)).filter(Boolean);

  if (!TASK_TYPES.includes(type)) return { error: "Pick a valid booking type." };
  if (!scheduledDateRaw) return { error: "A date is required." };
  if (endDateRaw && endDateRaw < scheduledDateRaw) return { error: "To date can't be before the from date." };

  // A multi-day install with no end date given runs for the job's install days (working days, skipping weekends).
  let endDate: Date | null = endDateRaw ? new Date(endDateRaw) : null;
  if (!endDate && type === "Installation") {
    const j = await prisma.job.findUnique({ where: { number: jobNumber }, select: { installDays: true } });
    const days = Math.ceil(j?.installDays ?? 1);
    if (days > 1) {
      endDate = new Date(scheduledDateRaw);
      let remaining = days - 1;
      while (remaining > 0) {
        endDate.setDate(endDate.getDate() + 1);
        if (endDate.getDay() !== 0 && endDate.getDay() !== 6) remaining -= 1;
      }
    }
  }

  const task = await prisma.jobScheduledTask.create({
    data: {
      jobNumber,
      type,
      scheduledDate: new Date(scheduledDateRaw),
      endDate,
      status,
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
  const user = await requireNotInstaller();

  const existing = await prisma.jobScheduledTask.findUnique({ where: { id } });
  if (!existing) return { error: "Booking not found." };

  const type = String(formData.get("type") ?? "").trim();
  const scheduledDateRaw = String(formData.get("scheduledDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const endDateRaw = String(formData.get("endDate") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() || "Floating";
  const assigneeIds = formData.getAll("assigneeIds").map((v) => String(v)).filter(Boolean);

  if (!TASK_TYPES.includes(type)) return { error: "Pick a valid booking type." };
  if (!scheduledDateRaw) return { error: "A date is required." };
  if (endDateRaw && endDateRaw < scheduledDateRaw) return { error: "To date can't be before the from date." };

  await prisma.jobScheduledTask.update({
    where: { id },
    data: {
      type,
      scheduledDate: new Date(scheduledDateRaw),
      endDate: endDateRaw ? new Date(endDateRaw) : null,
      notes: notes || null,
      status,
      completedAt: status === "Fully Invoiced" ? new Date() : null,
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
  const user = await requireNotInstaller();
  await prisma.job.update({ where: { number }, data: { archived: true } });
  await logAudit({ userId: user.id, action: "job_archived", entityType: "Job", entityId: number });
  revalidatePath("/jobs");
}

export async function reactivateJob(number: string) {
  const user = await requireNotInstaller();
  await prisma.job.update({ where: { number }, data: { archived: false } });
  await logAudit({ userId: user.id, action: "job_reactivated", entityType: "Job", entityId: number });
  revalidatePath("/jobs");
}

export interface SendTemplateState {
  error?: string;
  success?: boolean;
}

/** Sends a (possibly hand-edited) templated email about a job, recorded on that job's activity feed. */
export async function sendTemplatedEmail(_prevState: SendTemplateState, formData: FormData): Promise<SendTemplateState> {
  const user = await requireNotInstaller();
  const jobNumber = String(formData.get("jobNumber") ?? "").trim();
  const to = String(formData.get("to") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!jobNumber) return { error: "Missing job." };
  if (!to || !to.includes("@")) return { error: "Enter a valid recipient email." };
  if (!subject || !body) return { error: "Subject and body can't be empty." };

  const job = await prisma.job.findUnique({ where: { number: jobNumber } });
  if (!job) return { error: `Job ${jobNumber} not found.` };

  try {
    await sendPlainNotificationEmail({ to, subject, text: body });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not send the email." };
  }

  await logAudit({ userId: user.id, action: "templated_email_sent", entityType: "Job", entityId: jobNumber, metadata: { to, subject } });
  revalidatePath(`/jobs/${jobNumber}`);
  return { success: true };
}
