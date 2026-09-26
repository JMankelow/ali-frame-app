import { NextRequest, NextResponse } from "next/server";
import { createMonthlyVehicleChecklists } from "@/app/(app)/vehicles/checklistActions";

// Needs its own MONTHLY-schedule Render Cron Job (separate from the daily
// overdue-check job at /api/cron/vehicle-checklists) — run once a month,
// e.g. on the 1st:
// curl -f "$APP_URL/api/cron/vehicle-checklists-monthly?secret=$CRON_SECRET"
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await createMonthlyVehicleChecklists();
  return NextResponse.json(result);
}
