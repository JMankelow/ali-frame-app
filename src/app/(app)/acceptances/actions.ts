// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireNotInstaller } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { sendPlainNotificationEmail } from "@/lib/email";
import { appUrl } from "@/lib/invite";

const CHECK_MEASURE_OWNER_EMAIL = "tanya@aliframe.co.nz";

export interface AcceptanceFormState {
  error?: string;
}

const money = (v: number | null | undefined) => (v == null ? "" : ` (${v.toLocaleString("en-NZ", { style: "currency", currency: "NZD" })})`);

/**
 * Tells Tanya a job is accepted AND paid, so she can book the check measure: an in-app task plus an
 * email. Sent once per acceptance (tanyaNotifiedAt). A failed email never blocks recording the acceptance.
 */
async function notifyReadyForCheckMeasure(acceptanceId: string, actorId: string) {
  const a = await prisma.acceptance.findUnique({ where: { id: acceptanceId }, include: { job: { include: { client: true } } } });
  if (!a || a.tanyaNotifiedAt || !a.depositPaidAt) return;

  const tanya = await prisma.user.findFirst({ where: { email: CHECK_MEASURE_OWNER_EMAIL, isActive: true }, include: { employeeDetail: true } });
  const who = a.job.client?.name ?? a.job.title;
  const text = `Job ${a.jobNumber} (${who}) — quote accepted by ${a.acceptedBy} and deposit paid${money(a.depositAmount)}. Ready to book the check measure.`;

  if (tanya) {
    await prisma.note.create({ data: { text, authorId: actorId, assignedToId: tanya.id, jobNumber: a.jobNumber } });
    const to = tanya.employeeDetail?.inviteTo === "personal" && tanya.employeeDetail.personalEmail ? tanya.employeeDetail.personalEmail : tanya.email;
    await sendPlainNotificationEmail({
      to,
      subject: `Ready for check measure — ${a.jobNumber} ${who}`,
      text: `${text}\n\nOpen the job: ${appUrl()}/jobs/${encodeURIComponent(a.jobNumber)}`,
    }).catch(() => undefined);
  }

  await prisma.acceptance.update({ where: { id: a.id }, data: { tanyaNotifiedAt: new Date() } });
  await logAudit({ userId: actorId, action: "acceptance_ready_for_check_measure", entityType: "Job", entityId: a.jobNumber, metadata: { notified: tanya?.email ?? "no active Tanya account" } });
}

export async function createAcceptance(_prevState: AcceptanceFormState, formData: FormData): Promise<AcceptanceFormState> {
  const user = await requireNotInstaller();

  const jobNumber = String(formData.get("jobNumber") ?? "").trim();
  const acceptedBy = String(formData.get("acceptedBy") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const paid = formData.get("depositPaid") === "on";
  const amountRaw = String(formData.get("depositAmount") ?? "").trim().replace(/[$,]/g, "");
  const amount = amountRaw ? Number(amountRaw) : null;

  if (!jobNumber) return { error: "Job number is required." };
  if (!acceptedBy) return { error: "Who accepted the quote is required." };
  if (amount != null && (!Number.isFinite(amount) || amount < 0)) return { error: "Enter the deposit amount as a number." };

  const job = await prisma.job.findUnique({ where: { number: jobNumber } });
  if (!job) return { error: `Job ${jobNumber} not found.` };

  const created = await prisma.acceptance.create({
    data: { jobNumber, acceptedBy, notes: notes || null, createdById: user.id, depositPaidAt: paid ? new Date() : null, depositAmount: paid ? amount : null },
  });

  await logAudit({ userId: user.id, action: "acceptance_created", entityType: "Acceptance", metadata: { jobNumber, acceptedBy, depositPaid: paid } });
  if (paid) await notifyReadyForCheckMeasure(created.id, user.id);
  revalidatePath("/acceptances");
  return {};
}

/** Payment arrives after the acceptance was recorded — this is the moment Tanya gets told. */
export async function markDepositPaid(id: string, formData: FormData) {
  const user = await requireNotInstaller();
  const amountRaw = String(formData.get("depositAmount") ?? "").trim().replace(/[$,]/g, "");
  const amount = amountRaw ? Number(amountRaw) : null;
  if (amount != null && (!Number.isFinite(amount) || amount < 0)) return;

  const a = await prisma.acceptance.findUnique({ where: { id } });
  if (!a || a.depositPaidAt) return;
  await prisma.acceptance.update({ where: { id }, data: { depositPaidAt: new Date(), depositAmount: amount } });
  await logAudit({ userId: user.id, action: "acceptance_deposit_paid", entityType: "Job", entityId: a.jobNumber, metadata: { amount } });
  await notifyReadyForCheckMeasure(id, user.id);
  revalidatePath("/acceptances");
}
