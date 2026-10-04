// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getObjectBuffer } from "@/lib/storage";

// Streams a company policy PDF to any signed-in user. The file is fetched server-side, so no
// storage URL or key is ever exposed to the browser.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const policy = await prisma.companyPolicy.findFirst({ where: { id, active: true } });
  if (!policy) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await getObjectBuffer(policy.storageKey);
  const safeName = policy.fileName.replace(/[^a-zA-Z0-9._ -]/g, "_");
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
