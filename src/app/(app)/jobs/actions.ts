"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireNotInstaller } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { installEndDate } from "@/lib/installDates";
import { ensureQaSheet } from "@/lib/qaAuto";
import { crewOnJob, notifyUsers } from "@/lib/notify";
import { emailBookingToCrew } from "@/lib/bookingEmail";
import { getObjectBuffer } from "@/lib/storage";
import { sendPlainNotificationEmail, profileSigner } from "@/lib/email";

/** Tells the job's sales rep, by email, that the job is now confirmed as booked in. Best-effort — never blocks the save. */
async function notifySalesRepBookedIn(jobNumber: string, actor: { id: string; name: string; email: string }, when?: { start: Date; end?: Date | null; crew?: string[] }) {
  try {
    const job = await prisma.job.findUnique({ where: { number: jobNumber }, include: { assignedUser: { select: { id: true, name: true, email: true } }, client: { select: { name: true } } } });
    const rep = job?.assignedUser;
    if (!job || !rep?.email || rep.id === actor.id) return;
    const fmt = (d: Date) => d.toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    const lines = [
      `Hi ${rep.name.split(" ")[0]},`,
      "",
      `Job ${job.number} (${job.client?.name ?? job.title}) has been confirmed as booked in.`,
      ...(when ? [`Install: ${fmt(when.start)}${when.end && when.end.getTime() !== when.start.getTime() ? ` to ${fmt(when.end)}` : ""}`] : []),
      ...(when?.crew?.length ? [`Crew: ${when.crew.join(", ")}`] : []),
      ...(job.address ? [`Address: ${job.address}`] : []),
      "",
      `Booked by ${actor.name}.`,
    ];
    await sendPlainNotificationEmail({ to: rep.email, subject: `Job ${job.number} booked in — ${job.client?.name ?? job.title}`, text: lines.join("\n"), replyTo: actor.email, signer: profileSigner(actor.email) ?? { name: actor.name } });
    await logAudit({ userId: actor.id, action: "sales_rep_notified_booked_in", entityType: "Job", entityId: jobNumber, metadata: { to: rep.name } });
  } catch (e) {
    console.error("[jobs] booked-in notification failed", e);
  }
}

export interface JobFormState {
  error?: string;
}

export interface ClientHit {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

/** Type-ahead for the Add Job form — finds previous customers so their details don't have to be typed again. */
export async function searchClients(q: string): Promise<ClientHit[]> {
  await requireNotInstaller();
  const term = String(q ?? "").trim().slice(0, 60);
  if (term.length < 2) return [];
  return prisma.client.findMany({
    where: { OR: [{ name: { contains: term, mode: "insensitive" } }, { phone: { contains: term } }, { email: { contains: term, mode: "insensitive" } }] },
    orderBy: { name: "asc" },
    take: 8,
    select: { id: true, name: true, phone: true, email: true, address: true },
  });
}

export async function createJob(_prevState: JobFormState, formData: FormData): Promise<JobFormState> {
  // Real, server-side check — every signed-in user can create a job for now;
  // tighten with requireRole(...) once role rules for Jobs are decided.
  const user = await requireNotInstaller();

  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const number = str("number");
  const clientName = str("clientName");
  const clientPhone = str("clientPhone");
  const clientEmail = str("clientEmail");
  const existingClientId = str("clientId");
  const address = str("address");
  const type = str("type") || "RESIDENTIAL";
  const status = str("status") || "New";
  const supplier = str("supplier");
  const priceType = str("priceType");
  const leadSource = str("leadSource");
  const assignedUserId = str("assignedUserId");
  const installDaysRaw = str("installDays");
  const installDays = installDaysRaw ? parseFloat(installDaysRaw) : null;

  if (!number) return { error: "Job number is required." };
  if (!clientName) return { error: "Customer name is required." };
  if (installDays != null && (!Number.isFinite(installDays) || installDays <= 0 || installDays > 60)) return { error: "Install days must be a number between 0.5 and 60." };
  if (status === "Quote Accepted" && !installDays) return { error: "How many install days does this job need? Enter it before marking the quote accepted." };

  const existing = await prisma.job.findUnique({ where: { number } });
  if (existing) return { error: `Job ${number} already exists.` };

  // A previous customer picked from the search keeps their record; otherwise a new customer is created.
  let clientId: string | null = null;
  if (existingClientId) {
    const c = await prisma.client.findUnique({ where: { id: existingClientId }, select: { id: true } });
    if (c) {
      clientId = c.id;
      await prisma.client.update({ where: { id: c.id }, data: { name: clientName, phone: clientPhone || null, email: clientEmail || null, ...(address ? { address } : {}) } });
    }
  }
  if (!clientId) {
    const created = await prisma.client.create({ data: { name: clientName, phone: clientPhone || null, email: clientEmail || null, address: address || null } });
    clientId = created.id;
  }

  await prisma.job.create({
    data: {
      number,
      title: clientName,
      clientId,
      address: address || null,
      phone: clientPhone || null,
      email: clientEmail || null,
      type: type === "COMMERCIAL" ? "COMMERCIAL" : "RESIDENTIAL",
      status,
      supplier: supplier || null,
      priceType: priceType || null,
      leadSource: leadSource || null,
      installDays: installDays ?? null,
      assignedUserId: assignedUserId || null,
    },
  });

  // Same automatic records as when a job's status is edited to these values.
  if (status === "Quote Accepted") {
    await prisma.acceptance.create({ data: { jobNumber: number, acceptedBy: clientName, notes: "Auto-recorded on job creation as Quote Accepted", createdById: user.id } });
  }

  await logAudit({ userId: user.id, action: "job_created", entityType: "Job", entityId: number });
  revalidatePath("/jobs");
  return {};
}

export interface JobBriefState {
  error?: string;
  saved?: string;
}

/** Saves "what the customer wants" (their email / the instructions) on the job. */
export async function saveJobBrief(jobNumber: string, _prev: JobBriefState, formData: FormData): Promise<JobBriefState> {
  const user = await requireNotInstaller();
  const text = String(formData.get("description") ?? "").replace(/\r/g, "").trim().slice(0, 20000);
  const job = await prisma.job.findUnique({ where: { number: jobNumber }, select: { number: true } });
  if (!job) return { error: `Job ${jobNumber} not found.` };
  await prisma.job.update({ where: { number: jobNumber }, data: { description: text || null } });
  await logAudit({ userId: user.id, action: "job_brief_saved", entityType: "Job", entityId: jobNumber });
  revalidatePath(`/jobs/${jobNumber}`);
  return { saved: "Saved." };
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

  // Install days feed the Calendar: every active Installation booking for this job now runs for that many working days.
  if (installDays != null && installDays !== job.installDays) {
    const installs = await prisma.jobScheduledTask.findMany({ where: { jobNumber: number, type: "Installation", status: { not: "Cancelled" } }, select: { id: true, scheduledDate: true } });
    for (const t of installs) await prisma.jobScheduledTask.update({ where: { id: t.id }, data: { endDate: installEndDate(t.scheduledDate, installDays) } });
  }

  if (["Quote Accepted", "Joinery Ordered", "Installation Date Confirmed"].includes(status) && (status !== job.status || type !== job.type)) {
    await ensureQaSheet(number, user.id).catch((e) => console.error("[qa] auto-create failed", e));
  }

  if (status === "Installation Date Confirmed" && job.status !== "Installation Date Confirmed") {
    const inst = await prisma.jobScheduledTask.findFirst({ where: { jobNumber: number, type: "Installation", status: { not: "Cancelled" } }, orderBy: { scheduledDate: "asc" }, include: { assignees: { select: { name: true } } } });
    await notifySalesRepBookedIn(number, user, inst ? { start: inst.scheduledDate, end: inst.endDate, crew: inst.assignees.map((a) => a.name) } : undefined);
  }

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
  // Everyone booked on this job gets an in-app alert (bell + My Tasks) — except whoever wrote the note.
  try {
    await notifyUsers(await crewOnJob(jobNumber, user.id), `New note on job ${jobNumber} from ${user.name}: ${text}`, `/jobs/${jobNumber}#notes`);
  } catch (e) {
    console.error("[jobs] note alert failed", e);
  }
  await logAudit({ userId: user.id, action: "note_added", entityType: "Job", entityId: jobNumber });
  revalidatePath(`/jobs/${jobNumber}`);
  return {};
}

export interface ScheduledTaskState {
  error?: string;
}

const timeOf = (v: FormDataEntryValue | null) => {
  const t = String(v ?? "").trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t) ? t : null;
};

/** "Days required" on a booking: the booking then runs that many working days from its start date (weekends skipped). */
function daysRequired(formData: FormData): number | null {
  const n = parseFloat(String(formData.get("days") ?? "").trim());
  return Number.isFinite(n) && n > 0 && n <= 60 ? n : null;
}

/** Measures show on the Calendar by time: a start time is needed, and with no end time they run for one hour. */
function bookingTimes(type: string, formData: FormData): { startTime: string | null; endTime: string | null; error?: string } {
  const startTime = timeOf(formData.get("startTime"));
  let endTime = timeOf(formData.get("endTime"));
  const isMeasure = type === "Sales Measure" || type === "Check Measure";
  if (isMeasure && !startTime) return { startTime, endTime, error: "Enter a start time for the measure — it's what puts it in the right slot on the calendar." };
  if (startTime && endTime && endTime <= startTime) return { startTime, endTime, error: "End time must be after the start time." };
  if (isMeasure && startTime && !endTime) {
    const [h, m] = startTime.split(":").map(Number);
    const end = Math.min(h * 60 + m + 60, 23 * 60 + 59);
    endTime = String(Math.floor(end / 60)).padStart(2, "0") + ":" + String(end % 60).padStart(2, "0");
  }
  return { startTime, endTime };
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
  const times = bookingTimes(type, formData);
  if (times.error) return { error: times.error };

  // A multi-day install with no end date given runs for the job's install days (working days, skipping weekends).
  const days = daysRequired(formData);
  let endDate: Date | null = days ? installEndDate(new Date(scheduledDateRaw), days) : endDateRaw ? new Date(endDateRaw) : null;
  if (!days && !endDate && type === "Installation") {
    const j = await prisma.job.findUnique({ where: { number: jobNumber }, select: { installDays: true } });
    endDate = installEndDate(new Date(scheduledDateRaw), j?.installDays);
  }

  const task = await prisma.jobScheduledTask.create({
    data: {
      jobNumber,
      type,
      scheduledDate: new Date(scheduledDateRaw),
      endDate,
      startTime: times.startTime,
      endTime: times.endTime,
      status,
      notes: notes || null,
      createdById: user.id,
      assignees: { connect: assigneeIds.map((id) => ({ id })) },
    },
    include: { assignees: true },
  });
  // The days entered on an install booking are the job's install days too, so the job and the Calendar always agree.
  if (days && type === "Installation") await prisma.job.update({ where: { number: jobNumber }, data: { installDays: days } });

  await logAudit({
    userId: user.id,
    action: "scheduled_task_created",
    entityType: "Job",
    entityId: jobNumber,
    metadata: { type, scheduledDate: task.scheduledDate, assignees: task.assignees.map((a) => a.name) },
  });
  await emailBookingToCrew(task.id, user);
  if (type === "Installation") await ensureQaSheet(jobNumber, user.id).catch((e) => console.error("[qa] auto-create failed", e));
  if (type === "Installation") await notifySalesRepBookedIn(jobNumber, user, { start: task.scheduledDate, end: task.endDate, crew: task.assignees.map((a) => a.name) });
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

  const existing = await prisma.jobScheduledTask.findUnique({ where: { id }, include: { assignees: { select: { id: true } } } });
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
  const times = bookingTimes(type, formData);
  if (times.error) return { error: times.error };

  await prisma.jobScheduledTask.update({
    where: { id },
    data: {
      type,
      scheduledDate: new Date(scheduledDateRaw),
      endDate: daysRequired(formData) ? installEndDate(new Date(scheduledDateRaw), daysRequired(formData)) : endDateRaw ? new Date(endDateRaw) : type === "Installation" ? installEndDate(new Date(scheduledDateRaw), (await prisma.job.findUnique({ where: { number: existing.jobNumber }, select: { installDays: true } }))?.installDays) : null,
      startTime: times.startTime,
      endTime: times.endTime,
      notes: notes || null,
      status,
      completedAt: status === "Fully Invoiced" ? new Date() : null,
      assignees: { set: assigneeIds.map((aid) => ({ id: aid })) },
    },
  });

  const added = assigneeIds.filter((aid) => !existing.assignees.some((a) => a.id === aid));
  if (added.length) await emailBookingToCrew(id, user, added);
  if (daysRequired(formData) && type === "Installation") await prisma.job.update({ where: { number: existing.jobNumber }, data: { installDays: daysRequired(formData) } });

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

  // Optional attachments: only files that belong to this job, 15MB in total.
  const attachmentIds = formData.getAll("attachmentIds").map((v) => String(v)).filter(Boolean);
  const attachments: { filename: string; content: Buffer }[] = [];
  if (attachmentIds.length > 0) {
    const files = await prisma.fileAsset.findMany({ where: { id: { in: attachmentIds }, jobNumber } });
    if (files.length !== attachmentIds.length) return { error: "One of the selected files isn't on this job." };
    if (files.reduce((sum, f) => sum + f.sizeBytes, 0) > 15 * 1024 * 1024) return { error: "Attachments are over 15MB in total — send fewer or smaller files." };
    for (const f of files) attachments.push({ filename: f.fileName, content: await getObjectBuffer(f.storageKey) });
  }

  try {
    const detail = await prisma.employeeDetail.findUnique({ where: { userId: user.id }, select: { jobTitle: true } });
    const me = await prisma.user.findUnique({ where: { id: user.id }, select: { phone: true } });
    await sendPlainNotificationEmail({ to, subject, text: body, replyTo: user.email, attachments, signer: profileSigner(user.email) ?? { name: user.name, title: detail?.jobTitle, phone: me?.phone } });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not send the email." };
  }

  await logAudit({ userId: user.id, action: "templated_email_sent", entityType: "Job", entityId: jobNumber, metadata: { to, subject, attachments: attachments.map((a) => a.filename) } });
  revalidatePath(`/jobs/${jobNumber}`);
  return { success: true };
}
