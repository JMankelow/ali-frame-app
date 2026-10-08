// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isInstallerProfile } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

const WORK_TYPES = ["Install", "Check Measure", "Measure Up", "Remedial", "QA / Completion", "Travel / Pickup", "Other"];

/** NZ calendar date + clock time for an instant (the server runs in UTC; hours are recorded in NZ time). */
function nz(d: Date): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

export interface ClockState {
  error?: string;
  ok?: string;
}

/** Start the work clock on a job. One clock per person at a time. */
export async function startClock(jobNumber: string, workType: string, isRemedial = false): Promise<ClockState> {
  const user = await requireUser();
  const number = String(jobNumber ?? "").trim();
  if (!number) return { error: "Pick the job you're starting on." };
  const job = await prisma.job.findUnique({ where: { number }, select: { number: true } });
  if (!job) return { error: `Job ${number} not found.` };
  if (isInstallerProfile(user)) {
    const booked = await prisma.jobScheduledTask.findFirst({ where: { jobNumber: number, assignees: { some: { id: user.id } } }, select: { id: true } });
    if (!booked) return { error: "You can only clock on to jobs you're booked on." };
  }
  if (await prisma.timeClock.findUnique({ where: { userId: user.id } })) return { error: "Your clock is already running." };

  await prisma.timeClock.create({ data: { userId: user.id, jobNumber: number, workType: WORK_TYPES.includes(workType) ? workType : "Install", isRemedial: isRemedial || workType === "Remedial" } });
  await logAudit({ userId: user.id, action: "clock_started", entityType: "Job", entityId: number });
  revalidatePath("/dashboard");
  revalidatePath("/timesheets");
  return { ok: "Clock started." };
}

/** Stop the clock and save the time as a timesheet entry (start/finish in NZ time, minus any break). */
export async function stopClock(breakMinutesRaw: number, notesRaw: string): Promise<ClockState> {
  const user = await requireUser();
  const clock = await prisma.timeClock.findUnique({ where: { userId: user.id } });
  if (!clock) return { error: "No clock is running." };

  const now = new Date();
  const s = nz(clock.startedAt);
  let f = nz(now);
  let note = String(notesRaw ?? "").trim().slice(0, 500);
  // A clock left running past midnight is cut off at 23:59 on the day it started — the office can correct it.
  if (f.date !== s.date) {
    f = { date: s.date, time: "23:59" };
    note = (note ? note + " — " : "") + "Clock ran past midnight and was cut off at 23:59; please check.";
  }
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const breakMinutes = Math.max(0, Math.min(480, Math.floor(Number(breakMinutesRaw) || 0)));
  const worked = toMin(f.time) - toMin(s.time) - breakMinutes;

  await prisma.timeClock.delete({ where: { userId: user.id } });
  if (worked < 1) {
    revalidatePath("/dashboard");
    return { ok: "Clock stopped — under a minute, so nothing was recorded." };
  }
  const totalHours = Math.round((worked / 60) * 100) / 100;
  await prisma.timesheetEntry.create({
    data: { userId: user.id, jobNumber: clock.jobNumber, dateWorked: new Date(s.date), workType: clock.workType, startTime: s.time, finishTime: f.time, breakMinutes, totalHours, isRemedial: clock.isRemedial, notes: note || "Recorded with the work clock" },
  });
  await logAudit({ userId: user.id, action: "clock_stopped", entityType: "Job", entityId: clock.jobNumber, metadata: { totalHours } });
  revalidatePath("/dashboard");
  revalidatePath("/timesheets");
  revalidatePath(`/jobs/${clock.jobNumber}`);
  return { ok: `Saved ${totalHours} hours on job ${clock.jobNumber}.` };
}
