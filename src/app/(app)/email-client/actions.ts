"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireNotInstaller } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { sendCheckMeasureBookingEmail } from "@/lib/email";

export interface BookCheckMeasureFormState {
  error?: string;
  success?: boolean;
}

export async function bookCheckMeasure(
  _prevState: BookCheckMeasureFormState,
  formData: FormData
): Promise<BookCheckMeasureFormState> {
  const user = await requireNotInstaller();

  const jobNumber = String(formData.get("jobNumber") ?? "").trim();
  const datesRaw = formData.getAll("dates").map((d) => String(d)).filter(Boolean);

  if (!jobNumber) return { error: "Select a job first." };
  if (datesRaw.length === 0) return { error: "Pick at least one available date to offer." };

  const job = await prisma.job.findUnique({ where: { number: jobNumber }, include: { client: true } });
  if (!job) return { error: `Job ${jobNumber} not found.` };

  const to = job.client?.email || job.email;
  if (!to) return { error: "This job has no client email on file — add one on the job details first." };

  const dates = datesRaw
    .map((d) => new Date(d))
    .sort((a, b) => a.getTime() - b.getTime())
    .map((d) => d.toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" }));

  await sendCheckMeasureBookingEmail({
    to,
    jobNumber,
    clientName: job.client?.name ?? job.title,
    dates,
    fromName: user.name,
  });

  await prisma.job.update({ where: { number: jobNumber }, data: { status: "Check Measure Required" } });

  await logAudit({
    userId: user.id,
    action: "check_measure_booking_emailed",
    entityType: "Job",
    entityId: jobNumber,
    metadata: { to, dates },
  });

  revalidatePath("/email-client");
  revalidatePath(`/jobs/${jobNumber}`);
  revalidatePath("/acceptances");
  return { success: true };
}
