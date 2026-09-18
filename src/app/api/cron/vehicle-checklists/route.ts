import { NextRequest, NextResponse } from "next/server";
import { checkOverdueVehicleChecklists } from "@/app/(app)/vehicles/checklistActions";

// Hit daily by a Render Cron Job (set CRON_SECRET as a Render env var and
// pass it as ?secret=... — Render Cron Jobs run a shell command, e.g.
// `curl -f "$APP_URL/api/cron/vehicle-checklists?secret=$CRON_SECRET"`,
// not a second web service, so this is the only piece Jo needs to add).
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await checkOverdueVehicleChecklists();
  return NextResponse.json(result);
}
