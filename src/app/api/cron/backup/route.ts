import { NextRequest, NextResponse } from "next/server";
import { createBackup, pruneOldBackups } from "@/lib/backup";

// Hit once a day by a Render Cron Job, same CRON_SECRET convention as
// /api/cron/vehicle-checklists (see that route for the setup note).
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = await createBackup();
  await pruneOldBackups();
  return NextResponse.json({ key });
}
