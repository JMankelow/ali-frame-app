// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import "server-only";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

// Spellings of "install booked" that exist in real data (imported vs picked from the dropdown).
const INSTALL_BOOKED_STATUSES = ["Installation Date Confirmed", "Install Date confirmed", "Install Date Confirmed"];

/**
 * Moves jobs to "In Progress" once their Installation booking has started
 * (Tanya's request). Only touches jobs currently sitting at "install date
 * confirmed" — never overrides any other status — and leaves a line on the
 * job's activity feed.
 */
export async function startDueJobs(): Promise<{ started: string[] }> {
  const now = new Date();
  const jobs = await prisma.job.findMany({
    where: {
      archived: false,
      status: { in: INSTALL_BOOKED_STATUSES },
      scheduledTasks: { some: { type: "Installation", scheduledDate: { lte: now }, status: { notIn: ["Fully Invoiced"] } } },
    },
    select: { number: true, status: true },
  });

  const started: string[] = [];
  for (const j of jobs) {
    await prisma.job.update({ where: { number: j.number }, data: { status: "In Progress" } });
    await logAudit({
      action: "job_updated",
      entityType: "Job",
      entityId: j.number,
      metadata: { statusFrom: j.status, statusTo: "In Progress", auto: "install booking started" },
    });
    started.push(j.number);
  }
  return { started };
}
