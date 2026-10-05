// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { isInstallerProfile } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getDownloadUrl } from "@/lib/storage";
import { QaEditor } from "./QaEditor";

export default async function QaReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const report = await prisma.qaReport.findUnique({
    where: { id },
    include: { job: { include: { client: true } }, createdBy: { select: { name: true } }, photos: { orderBy: { sortOrder: "asc" }, include: { file: true } } },
  });
  if (!report) notFound();
  const canEdit = !isInstallerProfile(user) || report.createdById === user.id;
  if (!canEdit && isInstallerProfile(user)) notFound(); // installers only see their own reports

  const photos = await Promise.all(
    report.photos.map(async (p) => {
      let url = "";
      try {
        url = await getDownloadUrl(p.file.storageKey, p.file.fileName);
      } catch {
        /* storage not reachable — the card still shows the label and description */
      }
      return { id: p.id, url, name: p.file.fileName, label: p.label, description: p.description };
    }),
  );

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>{report.title}</h2>
          <div className="subtitle">
            Job {report.jobNumber} — {report.job.client?.name ?? report.job.title}
            {report.job.address ? ` · ${report.job.address}` : ""} · by {report.createdBy.name}
          </div>
        </div>
        <Link href="/health-safety/qa" className="btn light">← QA Reporting</Link>
      </div>

      <QaEditor
        reportId={report.id}
        jobNumber={report.jobNumber}
        initial={{ title: report.title, description: report.description, reportDate: report.reportDate.toISOString().slice(0, 10), photos }}
        final={report.status === "Final"}
        canEdit={canEdit}
      />
    </div>
  );
}
