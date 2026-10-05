// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { isInstallerProfile } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { generateIncidentPdf } from "@/lib/incidentPdf";
import type { Answers } from "@/lib/incidentLogic";

/** An accident / incident report as a PDF. Health information: management can open any; field staff only their own. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;
  const r = await prisma.incidentReport.findUnique({ where: { id }, include: { submittedBy: { select: { name: true } } } });
  if (!r || (isInstallerProfile(user) && r.submittedById !== user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pdf = await generateIncidentPdf({
    reference: r.reference,
    status: r.status,
    submittedAt: r.submittedAt,
    submittedBy: r.submittedBy.name,
    answers: r.data as Answers,
    signature: r.signature,
  });
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${r.reference} incident report.pdf"`, "Cache-Control": "private, no-store" },
  });
}
