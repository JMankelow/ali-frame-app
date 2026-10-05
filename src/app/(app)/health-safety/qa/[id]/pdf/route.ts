// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { isInstallerProfile } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getObjectBuffer } from "@/lib/storage";
import { generateQaReportPdf } from "@/lib/qaPdf";

/** The QA report as a PDF. Installers can only open their own. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;

  const report = await prisma.qaReport.findUnique({
    where: { id },
    include: { job: { include: { client: true } }, createdBy: { select: { name: true } }, photos: { orderBy: { sortOrder: "asc" }, include: { file: true } } },
  });
  if (!report || (isInstallerProfile(user) && report.createdById !== user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const photos: { label: string; description: string; data: Buffer | null; format: "jpg" | "png" | null }[] = [];
  for (const p of report.photos) {
    let data: Buffer | null = null;
    const format: "jpg" | "png" | null = p.file.mimeType === "image/png" ? "png" : p.file.mimeType === "image/jpeg" ? "jpg" : null;
    if (format) {
      try {
        data = await getObjectBuffer(p.file.storageKey);
      } catch (e) {
        console.error("[qa] could not read a photo from storage", e);
        return NextResponse.json({ error: "The photos couldn't be read — file storage isn't working yet." }, { status: 503 });
      }
    }
    photos.push({ label: p.label, description: p.description, data, format: data ? format : null });
  }

  const pdf = await generateQaReportPdf({
    title: report.title,
    status: report.status,
    reportDate: report.reportDate,
    jobNumber: report.jobNumber,
    clientName: report.job.client?.name ?? report.job.title,
    address: report.job.address,
    createdBy: report.createdBy.name,
    description: report.description,
    photos,
  });
  const name = `QA Report ${report.jobNumber} - ${report.reportDate.toISOString().slice(0, 10)}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${name}"`, "Cache-Control": "private, no-store" },
  });
}
