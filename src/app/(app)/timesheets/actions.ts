"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export interface TimesheetFormState {
  error?: string;
}

// Only office/management can log or approve hours on someone else's behalf —
// otherwise any signed-in installer could submit or self-approve hours
// attributed to a coworker via a spoofed staffUserId form field.
const TIMESHEET_ADMIN_ROLES = ["ADMIN_MANAGEMENT", "OFFICE_SCHEDULING"] as const;

function computeHours(start: string, finish: string, breakMinutes: number): number {
  const [sh, sm] = start.split(":").map(Number);
  const [fh, fm] = finish.split(":").map(Number);
  const minutes = fh * 60 + fm - (sh * 60 + sm) - breakMinutes;
  return Math.max(0, Math.round((minutes / 60) * 100) / 100);
}

export async function createTimesheetEntry(_prevState: TimesheetFormState, formData: FormData): Promise<TimesheetFormState> {
  const user = await requireUser();

  const staffUserId = String(formData.get("staffUserId") ?? "").trim() || user.id;
  if (staffUserId !== user.id) {
    try {
      await requireRole(...TIMESHEET_ADMIN_ROLES);
    } catch {
      return { error: "You can only log your own hours." };
    }
  }
  const jobNumber = String(formData.get("jobNumber") ?? "").trim();
  const dateWorked = String(formData.get("dateWorked") ?? "").trim();
  const workType = String(formData.get("workType") ?? "Install");
  const startTime = String(formData.get("startTime") ?? "").trim();
  const finishTime = String(formData.get("finishTime") ?? "").trim();
  const breakMinutes = parseInt(String(formData.get("breakMinutes") ?? "0"), 10) || 0;
  const notes = String(formData.get("notes") ?? "").trim();

  if (!jobNumber) return { error: "Job number is required." };
  if (!dateWorked) return { error: "Date worked is required." };
  if (!startTime || !finishTime) return { error: "Start and finish time are required." };

  const job = await prisma.job.findUnique({ where: { number: jobNumber } });
  if (!job) return { error: `Job ${jobNumber} not found.` };

  const totalHours = computeHours(startTime, finishTime, breakMinutes);
  if (totalHours <= 0) return { error: "Finish time must be after start time (minus the break)." };

  await prisma.timesheetEntry.create({
    data: {
      userId: staffUserId,
      jobNumber,
      dateWorked: new Date(dateWorked),
      workType,
      startTime,
      finishTime,
      breakMinutes,
      totalHours,
      notes: notes || null,
    },
  });

  await logAudit({ userId: user.id, action: "timesheet_created", entityType: "TimesheetEntry", metadata: { jobNumber, staffUserId, totalHours } });
  revalidatePath("/timesheets");
  return {};
}

export async function approveTimesheetEntry(id: string) {
  const user = await requireRole(...TIMESHEET_ADMIN_ROLES);
  await prisma.timesheetEntry.update({ where: { id }, data: { status: "Approved" } });
  await logAudit({ userId: user.id, action: "timesheet_approved", entityType: "TimesheetEntry", entityId: id });
  revalidatePath("/timesheets");
}
