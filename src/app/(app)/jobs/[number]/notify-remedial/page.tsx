// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { isInstallerProfile } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { NotifyRemedialForm } from "./NotifyRemedialForm";

export default async function NotifyRemedialPage({ params }: { params: Promise<{ number: string }> }) {
  const user = await requireUser();
  const { number } = await params;
  const job = await prisma.job.findUnique({ where: { number }, select: { number: true, title: true, address: true, client: { select: { name: true } } } });
  if (!job) notFound();
  if (isInstallerProfile(user) && !(await prisma.jobScheduledTask.findFirst({ where: { jobNumber: number, assignees: { some: { id: user.id } } }, select: { id: true } }))) notFound();

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland" }).format(new Date());
  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Notify remedial</h2>
          <div className="subtitle">{job.number} — {job.client?.name ?? job.title}{job.address ? ` · ${job.address}` : ""}</div>
        </div>
        <Link href={`/jobs/${job.number}`} className="btn light">← Back to the job</Link>
      </div>
      <div className="hint" style={{ marginBottom: 12 }}>This alerts Tanya and Tristam straight away — by email and on their task lists — and adds your photos to the job.</div>
      <NotifyRemedialForm jobNumber={job.number} today={today} />
    </div>
  );
}
