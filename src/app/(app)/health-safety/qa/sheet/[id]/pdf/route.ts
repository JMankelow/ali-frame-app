// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { isInstallerProfile } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getObjectBuffer } from "@/lib/storage";
import { generateCommercialQaPdf, generateResidentialQaPdf, type PhotoMap } from "@/lib/qaSheetPdf";
import { migrateResidential, type CommercialData, type ResidentialData } from "@/lib/qaSheets";

/** A QA check sheet as a PDF. Installers can only open their own. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;
  const sheet = await prisma.qaCheckSheet.findUnique({ where: { id }, include: { job: { include: { client: true } }, createdBy: { select: { name: true } } } });
  if (!sheet || (isInstallerProfile(user) && sheet.createdById !== user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = sheet.kind === "RESIDENTIAL" ? migrateResidential(sheet.data) : (sheet.data as unknown as CommercialData);
  const ids = new Set<string>();
  if (sheet.kind === "RESIDENTIAL") for (const it of (data as ResidentialData).items) it.photoFileIds.forEach((x) => ids.add(x));
  else for (const it of (data as CommercialData).items) for (const arr of Object.values(it.qa.photos)) arr.forEach((x) => ids.add(x));

  const photos: PhotoMap = {};
  if (ids.size) {
    const files = await prisma.fileAsset.findMany({ where: { id: { in: [...ids] }, jobNumber: sheet.jobNumber } });
    for (const f of files) {
      const format = f.mimeType === "image/png" ? "png" : f.mimeType === "image/jpeg" ? "jpg" : null;
      if (!format) continue;
      try {
        photos[f.id] = { data: await getObjectBuffer(f.storageKey), format };
      } catch (e) {
        console.error("[qa-sheet] could not read a photo from storage", e);
        return NextResponse.json({ error: "The photos couldn't be read — file storage isn't working yet." }, { status: 503 });
      }
    }
  }

  const common = {
    jobNumber: sheet.jobNumber,
    siteAddress: sheet.job.address ?? sheet.job.title,
    clientName: sheet.job.client?.name ?? null,
    createdBy: sheet.createdBy.name,
    status: sheet.status,
    photos,
  };
  const pdf = sheet.kind === "RESIDENTIAL" ? await generateResidentialQaPdf(data as ResidentialData, common) : await generateCommercialQaPdf(data as CommercialData, common);
  const name = `${sheet.kind === "RESIDENTIAL" ? "Residential" : "Commercial"} QA ${sheet.jobNumber}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${name}"`, "Cache-Control": "private, no-store" },
  });
}
