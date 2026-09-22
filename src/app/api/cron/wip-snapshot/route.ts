import { NextRequest, NextResponse } from "next/server";
import { postMonthlyWipSnapshot } from "@/lib/wip";

// Intended to run once a month (the 30th) via a separate, monthly-schedule
// Render Cron Job — the existing daily cron covers vehicle checklists,
// backups, and installer reviews; this one needs its own schedule since
// it's monthly, not daily. Same CRON_SECRET convention as the others.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await postMonthlyWipSnapshot();
  return NextResponse.json(result);
}
