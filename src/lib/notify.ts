// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import "server-only";
import { prisma } from "@/lib/prisma";

/** In-app alerts: they add to the bell count and show at the top of My Tasks until marked read. */
export async function notifyUsers(userIds: string[], text: string, href: string) {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return;
  await prisma.notification.createMany({ data: ids.map((userId) => ({ userId, text: text.slice(0, 600), href })) });
}

/** Everyone booked on a job (any current booking), except the person doing the notifying. */
export async function crewOnJob(jobNumber: string, exceptUserId?: string): Promise<string[]> {
  const tasks = await prisma.jobScheduledTask.findMany({ where: { jobNumber, status: { not: "Cancelled" } }, select: { assignees: { select: { id: true } } } });
  return [...new Set(tasks.flatMap((t) => t.assignees.map((a) => a.id)))].filter((id) => id !== exceptUserId);
}
