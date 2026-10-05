// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireNotInstaller } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { sendPlainNotificationEmail, profileSigner } from "@/lib/email";

export interface BookAppointmentState {
  error?: string;
  success?: string;
}

const APPOINTMENT_TYPES = ["Sales Measure", "Check Measure"] as const;
// Measure appointments are only ever done by these three people.
const MEASURE_STAFF = ["kere", "tristam", "dwayne"];

const hhmm = (v: FormDataEntryValue | null) => {
  const t = String(v ?? "").trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t) ? t : null;
};
const nice = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, "0")}` : ""}${h >= 12 ? "pm" : "am"}`;
};

/** The booking + (optionally) a confirmation email to the client. The client is already on the job, so nothing else is asked. */
export async function bookAppointment(_prev: BookAppointmentState, formData: FormData): Promise<BookAppointmentState> {
  const user = await requireNotInstaller();

  const jobNumber = String(formData.get("jobNumber") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const dateRaw = String(formData.get("date") ?? "").trim();
  const startTime = hhmm(formData.get("startTime"));
  const endTime = hhmm(formData.get("endTime"));
  const notes = String(formData.get("notes") ?? "").trim();
  const assigneeIds = formData.getAll("assigneeIds").map(String).filter(Boolean);
  const emailClient = formData.get("emailClient") === "on";

  if (!jobNumber) return { error: "Choose the job first." };
  if (!(APPOINTMENT_TYPES as readonly string[]).includes(type)) return { error: "Choose Sales Measure or Check Measure." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) return { error: "Pick the appointment date." };
  if (!startTime) return { error: "Pick the start time." };
  if (endTime && endTime <= startTime) return { error: "The end time must be after the start time." };

  const job = await prisma.job.findUnique({ where: { number: jobNumber }, include: { client: true } });
  if (!job) return { error: `Job ${jobNumber} not found.` };

  const team = await prisma.user.findMany({ where: { id: { in: assigneeIds }, isActive: true }, select: { id: true, name: true } });
  if (team.some((t) => !MEASURE_STAFF.some((n) => t.name.toLowerCase().includes(n)))) return { error: "Measure appointments can only be allocated to Kere, Tristam or Dwayne." };
  if (team.length === 0) return { error: "Choose who is doing the appointment." };

  // Booking status follows the NextMinute task statuses.
  const onlyOne = team.length === 1 ? MEASURE_STAFF.find((n) => team[0].name.toLowerCase().includes(n)) : undefined;
  const status = type === "Check Measure" ? "Check Measure Booked" : onlyOne ? `Sales Rep Booked - ${onlyOne[0].toUpperCase()}${onlyOne.slice(1)}` : "Booked in";

  await prisma.jobScheduledTask.create({
    data: {
      jobNumber,
      type,
      scheduledDate: new Date(dateRaw),
      startTime,
      endTime,
      status,
      notes: notes || null,
      createdById: user.id,
      assignees: { connect: team.map((t) => ({ id: t.id })) },
    },
  });
  if (type === "Sales Measure" && ["New", "Tentative Sales Booking Awaiting"].includes(job.status)) {
    await prisma.job.update({ where: { number: jobNumber }, data: { status: "Measure & Quoted Booked" } });
  }

  let emailNote = "";
  if (emailClient) {
    const to = job.client?.email || job.email;
    if (!to) {
      emailNote = " No email was sent — there is no client email on the job.";
    } else {
      const first = (job.client?.name ?? job.title).trim().split(/\s+/)[0];
      const when = new Date(`${dateRaw}T12:00:00`).toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      const what = type === "Check Measure" ? "final check measure" : "measure and quote appointment";
      const body =
        `Hi ${first},\n\n` +
        `This is to confirm your ${what} with Ali-Frame:\n\n` +
        `${when}, ${nice(startTime)}${endTime ? ` – ${nice(endTime)}` : ""}\n` +
        (job.address ? `${job.address}\n` : "") +
        `\n${team.map((t) => t.name.split(" ")[0]).join(" and ")} will be there to see you.\n\n` +
        `If that time doesn't suit, just reply to this email and we'll find another.\n\nThank you.`;
      try {
        const me = await prisma.user.findUnique({ where: { id: user.id }, select: { phone: true, employeeDetail: { select: { jobTitle: true } } } });
        await sendPlainNotificationEmail({
          to,
          subject: `Your ${type === "Check Measure" ? "check measure" : "measure appointment"} is booked — ${when}`,
          text: body,
          replyTo: user.email,
          signer: profileSigner(user.email) ?? { name: user.name, title: me?.employeeDetail?.jobTitle, phone: me?.phone },
        });
        emailNote = ` Confirmation emailed to ${to}.`;
      } catch (e) {
        console.error("[book-appointment] confirmation email failed", e);
        emailNote = " The booking is saved, but the confirmation email could not be sent.";
      }
    }
  }

  await logAudit({ userId: user.id, action: "appointment_booked", entityType: "Job", entityId: jobNumber, metadata: { type, date: dateRaw, startTime, emailed: emailClient } });
  revalidatePath("/calendar");
  revalidatePath(`/jobs/${jobNumber}`);
  return { success: `${type} booked for ${job.number} on ${new Date(`${dateRaw}T12:00:00`).toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" })} at ${nice(startTime)}.${emailNote}` };
}
