import { NextRequest, NextResponse } from "next/server";
import { checkOverdueInstallerAssessments } from "@/app/(app)/performance/reminders";

// Hit once a day by a Render Cron Job, same CRON_SECRET convention as
// /api/cron/vehicle-checklists and /api/cron/backup.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await checkOverdueInstallerAssessments();
  return NextResponse.json(result);
}
