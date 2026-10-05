// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { requireNotInstaller } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { cleanPack, emptyPack } from "@/lib/checkMeasure";
import { CheckMeasureForm } from "./CheckMeasureForm";

export default async function PrepareCheckMeasurePage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  await requireNotInstaller();
  const { job: jobParam } = await searchParams;

  const jobs = await prisma.job.findMany({ where: { archived: false }, orderBy: { number: "desc" }, select: { number: true, title: true } });
  const job = jobParam
    ? await prisma.job.findUnique({
        where: { number: jobParam },
        include: {
          client: true,
          costing: { select: { quoteNumber: true } },
          quotes: { select: { quoteNumber: true }, orderBy: { quoteDate: "desc" }, take: 1 },
          checkMeasurePack: true,
          files: { where: { fileType: "Supplier Quote", mimeType: "application/pdf" }, select: { id: true, fileName: true }, orderBy: { createdAt: "desc" } },
        },
      })
    : null;

  let initial = emptyPack();
  if (job) {
    if (job.checkMeasurePack) initial = cleanPack(job.checkMeasurePack.data);
    else {
      const q = job.costing?.quoteNumber ?? job.quotes[0]?.quoteNumber ?? "";
      initial = {
        ...initial,
        clientName: job.client?.name ?? job.title,
        siteAddress: job.address ?? "",
        supplierName: job.supplier ?? "",
        quoteNumber: q.replace(/^QUOTE-/i, ""),
      };
    }
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Prepare Check Measure</h2>
          <div className="subtitle">
            The approved AliFrame check-measure sheet: questionnaire, technical schedule with an item card for each opening, client declaration and operations completion — as one PDF.
          </div>
        </div>
      </div>
      <CheckMeasureForm key={job?.number ?? "none"} jobs={jobs} jobNumber={job?.number ?? ""} initial={initial} supplierFiles={job?.files ?? []} hasSaved={!!job?.checkMeasurePack} />
    </div>
  );
}
