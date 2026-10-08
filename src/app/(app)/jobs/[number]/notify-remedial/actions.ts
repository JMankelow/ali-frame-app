// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isInstallerProfile } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { sendPlainNotificationEmail } from "@/lib/email";
import { appUrl } from "@/lib/invite";

const ALERT_EMAILS = ["tanya@aliframe.co.nz", "tristam@aliframe.co.nz"];

export interface RemedialNotice {
  jobNumber: string;
  date: string; // YYYY-MM-DD
  what: string;
  required: string;
  photosAdded: number;
  photosFailed: number;
}
export interface RemedialResult {
  error?: string;
  ok?: boolean;
  emailed?: boolean;
}

const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

/** Raises a remedial on the job and alerts Tanya and Tristam straight away (email + a note on each of their task lists). */
export async function notifyRemedial(input: RemedialNotice): Promise<RemedialResult> {
  const user = await requireUser();
  const jobNumber = clip(input.jobNumber, 40);
  const date = clip(input.date, 10);
  const what = clip(input.what, 3000);
  const required = clip(input.required, 3000);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Enter the date it happened." };
  if (!what) return { error: "Say what happened." };
  if (!required) return { error: "Say what's required to put it right." };

  const job = await prisma.job.findUnique({ where: { number: jobNumber }, select: { number: true, title: true, address: true, client: { select: { name: true } } } });
  if (!job) return { error: `Job ${jobNumber} not found.` };
  if (isInstallerProfile(user)) {
    const booked = await prisma.jobScheduledTask.findFirst({ where: { jobNumber, assignees: { some: { id: user.id } } }, select: { id: true } });
    if (!booked) return { error: "You can only notify remedial on jobs you're booked on." };
  }

  const nice = new Date(`${date}T00:00:00Z`).toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const photoLine = input.photosAdded > 0 ? `${input.photosAdded} photo(s) are on the job's Photos tab (named "Remedial …").` : input.photosFailed > 0 ? `${input.photosFailed} photo(s) couldn't be uploaded — ask ${user.name} to send them.` : "No photos attached.";
  const issue = `Date: ${nice}\nWhat happened: ${what}\nWhat's required: ${required}\nReported by: ${user.name}`;

  await prisma.remedialItem.create({ data: { jobNumber, issue, priority: "High", raisedById: user.id } });

  const client = job.client?.name ?? job.title;
  const people = await prisma.user.findMany({ where: { email: { in: ALERT_EMAILS }, isActive: true }, select: { id: true, email: true, name: true } });
  const noteText = `⚠ REMEDIAL — Job ${jobNumber} (${client}${job.address ? `, ${job.address}` : ""})\n${issue}\n${photoLine}`;
  for (const p of people) {
    await prisma.note.create({ data: { text: noteText, authorId: user.id, assignedToId: p.id, jobNumber } });
  }

  let emailed = false;
  try {
    await sendPlainNotificationEmail({
      to: ALERT_EMAILS,
      subject: `REMEDIAL — Job ${jobNumber} — ${client}`,
      text: `${user.name} has notified remedial work on job ${jobNumber} (${client}${job.address ? `, ${job.address}` : ""}).\n\nDate it happened: ${nice}\n\nWhat happened:\n${what}\n\nWhat's required:\n${required}\n\n${photoLine}\n\nOpen the job: ${appUrl()}/jobs/${jobNumber}`,
      replyTo: user.email,
    });
    emailed = true;
  } catch (e) {
    console.error("[remedial] alert email failed", e);
  }

  await logAudit({ userId: user.id, action: "remedial_created", entityType: "Job", entityId: jobNumber, metadata: { priority: "High", via: "notify_remedial", emailed } });
  revalidatePath("/remedial");
  revalidatePath(`/jobs/${jobNumber}`);
  return { ok: true, emailed };
}
