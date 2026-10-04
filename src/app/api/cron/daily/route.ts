// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { NextRequest, NextResponse } from "next/server";
import { checkOverdueVehicleChecklists, createMonthlyVehicleChecklists } from "@/app/(app)/vehicles/checklistActions";
import { startDueJobs } from "@/lib/jobStart";

// ONE daily Render Cron Job runs everything time-based (early morning NZ time):
//   curl -f "$APP_URL/api/cron/daily?secret=$CRON_SECRET"
// - every day: flag overdue vehicle checklists to management; move jobs that have started to "In Progress"
// - 1st of the month: send the monthly vehicle check to every vehicle's driver
// Each step is isolated so one failure doesn't stop the others.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};
  const run = async (name: string, fn: () => Promise<unknown>) => {
    try {
      results[name] = await fn();
    } catch (e) {
      console.error(`[cron/daily] ${name} failed`, e);
      results[name] = { error: true };
    }
  };

  await run("jobStart", startDueJobs);
  await run("vehicleOverdue", checkOverdueVehicleChecklists);

  const nzDay = Number(new Intl.DateTimeFormat("en-NZ", { day: "numeric", timeZone: "Pacific/Auckland" }).format(new Date()));
  const force = req.nextUrl.searchParams.get("monthly") === "1";
  if (nzDay === 1 || force) await run("vehicleMonthly", createMonthlyVehicleChecklists);

  const failed = Object.values(results).some((r) => (r as { error?: boolean })?.error);
  return NextResponse.json(results, { status: failed ? 500 : 200 });
}
