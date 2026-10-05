// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ensureHsDocuments } from "@/lib/hsSeed";
import { generateHsDocumentPdf } from "@/lib/hsPdf";

/** One company Health & Safety document as a proper PDF (not a print of the web page). */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { slug } = await params;

  await ensureHsDocuments();
  const d = await prisma.hsDocument.findUnique({ where: { slug } });
  if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pdf = await generateHsDocumentPdf(d);
  const name = `${d.title.replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "document"}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${name}"`, "Cache-Control": "private, no-store" },
  });
}
