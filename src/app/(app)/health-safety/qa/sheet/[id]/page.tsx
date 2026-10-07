// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { isInstallerProfile } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getDownloadUrl } from "@/lib/storage";
import { migrateResidential, type CommercialData, type ResidentialData } from "@/lib/qaSheets";
import { canSignQa, canWorkOnSheet } from "../../sheetActions";
import { SheetEditor } from "./SheetEditor";

export default async function QaSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const sheet = await prisma.qaCheckSheet.findUnique({ where: { id }, include: { job: { include: { client: true } }, createdBy: { select: { name: true } } } });
  if (!sheet) notFound();
  if (!(await canWorkOnSheet(user, sheet))) notFound();

  // Every photo referenced anywhere in the sheet → a short-lived preview URL.
  const data = sheet.kind === "RESIDENTIAL" ? migrateResidential(sheet.data) : (sheet.data as unknown as CommercialData);
  const ids = new Set<string>();
  if (sheet.kind === "RESIDENTIAL") for (const it of (data as ResidentialData).items) it.photoFileIds.forEach((x) => ids.add(x));
  else for (const it of (data as CommercialData).items) for (const arr of Object.values(it.qa.photos)) arr.forEach((x) => ids.add(x));
  const files = ids.size ? await prisma.fileAsset.findMany({ where: { id: { in: [...ids] }, jobNumber: sheet.jobNumber } }) : [];
  const photoUrls: Record<string, string> = {};
  for (const f of files) photoUrls[f.id] = await getDownloadUrl(f.storageKey, f.fileName).catch(() => "");

  const staff = await prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const title = sheet.kind === "RESIDENTIAL" ? "Residential QA Check Sheet" : "Commercial QA Check Sheet";

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>{title}</h2>
          <div className="subtitle">
            Job {sheet.jobNumber} — {sheet.job.client?.name ?? sheet.job.title}
            {sheet.job.address ? ` · ${sheet.job.address}` : ""} · started by {sheet.createdBy.name}
          </div>
        </div>
        <Link href="/health-safety/qa" className="btn light">← QA Reporting</Link>
      </div>
      <SheetEditor
        sheetId={sheet.id}
        kind={sheet.kind as "RESIDENTIAL" | "COMMERCIAL"}
        jobNumber={sheet.jobNumber}
        siteAddress={sheet.job.address ?? sheet.job.title}
        initial={data}
        photoUrls={photoUrls}
        complete={sheet.status === "Complete"}
        canSign={await canSignQa(user)}
        staff={staff}
        userName={user.name}
      />
    </div>
  );
}
