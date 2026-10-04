// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { NextRequest, NextResponse } from "next/server";
import { startDueJobs } from "@/lib/jobStart";

// Daily Render Cron Job (early morning NZ time):
// curl -f "$APP_URL/api/cron/job-start?secret=$CRON_SECRET"
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await startDueJobs());
}
