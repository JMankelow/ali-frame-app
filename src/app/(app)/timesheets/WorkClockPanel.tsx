// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { prisma } from "@/lib/prisma";
import { isInstallerProfile } from "@/lib/permissions";
import { byNumberDesc } from "@/lib/jobSort";
import { WorkClock } from "./WorkClock";

/** The start / stop clock for the signed-in person. Field staff can only clock on to jobs they're booked on. */
export async function WorkClockPanel({ user, onlyIfRunning = false }: { user: { id: string; isSuperUser: boolean; role?: string }; onlyIfRunning?: boolean }) {
  const field = isInstallerProfile(user as { isSuperUser: boolean; role?: string });
  const [clock, jobs] = await Promise.all([
    prisma.timeClock.findUnique({ where: { userId: user.id }, include: { job: { select: { title: true } } } }),
    field
      ? prisma.job.findMany({ where: { archived: false, scheduledTasks: { some: { assignees: { some: { id: user.id } }, status: { not: "Cancelled" } } } }, select: { number: true, title: true }, take: 100 })
      : prisma.job.findMany({ where: { archived: false }, select: { number: true, title: true }, orderBy: { createdAt: "desc" }, take: 400 }),
  ]);

  if (onlyIfRunning && !clock) return null;

  return (
    <WorkClock
      active={clock ? { jobNumber: clock.jobNumber, jobTitle: clock.job.title, workType: clock.workType, isRemedial: clock.isRemedial, startedAt: clock.startedAt.toISOString() } : null}
      jobs={byNumberDesc(jobs)}
    />
  );
}
