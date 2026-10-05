// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { isInstallerProfile } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getObjectBuffer } from "@/lib/storage";
import { cleanPack } from "@/lib/checkMeasure";
import { generateCheckMeasurePdf } from "@/lib/checkMeasurePdf";

/** The saved check-measure pack as a PDF (AliFrame pages, then the supplier's own drawing pages). */
export async function GET(_req: Request, { params }: { params: Promise<{ jobNumber: string }> }) {
  const user = await getSessionUser();
  if (!user || isInstallerProfile(user)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const jobNumber = decodeURIComponent((await params).jobNumber);

  const pack = await prisma.checkMeasurePack.findUnique({ where: { jobNumber } });
  if (!pack) return NextResponse.json({ error: "Nothing saved for this job yet — fill in the form and press Save first." }, { status: 404 });
  const data = cleanPack(pack.data);

  let supplier: Buffer | null = null;
  if (data.supplierFileId) {
    const f = await prisma.fileAsset.findFirst({ where: { id: data.supplierFileId, jobNumber, fileType: "Supplier Quote" } });
    if (f) {
      try {
        supplier = await getObjectBuffer(f.storageKey);
      } catch (e) {
        console.error("[check-measure] could not read the supplier schedule", e);
        return NextResponse.json({ error: "The supplier schedule couldn't be read — file storage isn't working yet." }, { status: 503 });
      }
    }
  }
  const pdf = await generateCheckMeasurePdf(jobNumber, data, supplier);
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${jobNumber} Check Measure Sheet.pdf"`, "Cache-Control": "private, no-store" },
  });
}
