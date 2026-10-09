// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { isInstallerProfile } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { WarrantyForm } from "./WarrantyForm";

export default async function CreateWarrantyPage({ params }: { params: Promise<{ number: string }> }) {
  const user = await requireUser();
  if (isInstallerProfile(user)) redirect("/jobs");
  const { number } = await params;
  const job = await prisma.job.findUnique({
    where: { number },
    select: { number: true, title: true, address: true, client: { select: { name: true, address: true } }, costing: { select: { quoteNumber: true } }, quotes: { select: { quoteNumber: true }, orderBy: { quoteDate: "desc" }, take: 1 } },
  });
  if (!job) notFound();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland" }).format(new Date());

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Create warranty</h2>
          <div className="subtitle">{job.number} — {job.client?.name ?? job.title}</div>
        </div>
        <Link href={`/jobs/${job.number}`} className="btn light">← Back to the job</Link>
      </div>
      <div className="hint" style={{ marginBottom: 12 }}>
        Fills the certificate on page 8 of the Ali-Frame warranty booklet and keeps all eight pages. Check the details, then create it — the PDF downloads and a copy is saved on the job.
      </div>
      <WarrantyForm
        jobNumber={job.number}
        quoteNumber={job.quotes[0]?.quoteNumber ?? job.costing?.quoteNumber ?? ""}
        customerName={job.client?.name ?? job.title}
        customerAddress={job.address ?? job.client?.address ?? ""}
        today={today}
      />
    </div>
  );
}
