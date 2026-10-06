// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { byNumberDesc } from "@/lib/jobSort";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { isInstallerProfile } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { NewQaReportForm } from "./NewQaReportForm";

export default async function QaReportsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const { error } = await searchParams;
  const installer = isInstallerProfile(user);

  const [jobs, reports, sheets] = await Promise.all([
    prisma.job.findMany({ where: { archived: false }, orderBy: { number: "desc" }, select: { number: true, title: true } }),
    prisma.qaReport.findMany({
      where: installer ? { createdById: user.id } : {},
      orderBy: { reportDate: "desc" },
      take: 100,
      include: { job: { select: { title: true, address: true } }, createdBy: { select: { name: true } }, _count: { select: { photos: true } } },
    }),
    prisma.qaCheckSheet.findMany({
      where: installer ? { createdById: user.id } : {},
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { job: { select: { title: true } }, createdBy: { select: { name: true } } },
    }),
  ]);

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>QA Reporting</h2>
          <div className="subtitle">Select the job, add photos, label every photo and describe it — then download the report as a PDF.</div>
        </div>
        <Link href="/health-safety" className="btn light">← Health &amp; Safety</Link>
      </div>

      {error === "job" && <div className="authError">Select a job first.</div>}
      {error === "schedule" && <div className="authError">Couldn't read items from that schedule — pick another file, or type the items in instead.</div>}
      <NewQaReportForm jobs={byNumberDesc(jobs)} />

      <div className="card" style={{ marginTop: 16 }}>
        <div className="label">{installer ? "My QA check sheets" : "QA check sheets"}</div>
        <table style={{ marginTop: 8 }}>
          <thead>
            <tr><th>Updated</th><th>Type</th><th>Job</th><th>By</th><th>Status</th></tr>
          </thead>
          <tbody>
            {sheets.map((x) => (
              <tr key={x.id}>
                <td>{x.updatedAt.toLocaleDateString("en-NZ")}</td>
                <td><Link href={`/health-safety/qa/sheet/${x.id}`} style={{ fontWeight: 800, color: "var(--blueDark)", textDecoration: "none" }}>{x.kind === "RESIDENTIAL" ? "Residential QA check sheet" : "Commercial QA check sheet"}</Link>
                  <div className="hint">{(() => { const n = (x.data as { items?: unknown[] } | null)?.items?.length ?? 0; return `${n} item${n === 1 ? "" : "s"}`; })()}</div></td>
                <td>{x.jobNumber} — {x.job.title}</td>
                <td>{x.createdBy.name}</td>
                <td><span className={`status ${x.status === "Complete" ? "green" : "orange"}`}>{x.status}</span></td>
              </tr>
            ))}
            {sheets.length === 0 && <tr><td colSpan={5} className="hint">No check sheets yet — select a job above to start one.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="label">{installer ? "My photo reports" : "Photo reports"}</div>
        <table style={{ marginTop: 8 }}>
          <thead>
            <tr><th>Date</th><th>Job</th><th>Report</th><th style={{ textAlign: "right" }}>Photos</th><th>By</th><th>Status</th></tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td>{r.reportDate.toLocaleDateString("en-NZ")}</td>
                <td>{r.jobNumber} — {r.job.title}</td>
                <td><Link href={`/health-safety/qa/${r.id}`} style={{ fontWeight: 800, color: "var(--blueDark)", textDecoration: "none" }}>{r.title}</Link></td>
                <td style={{ textAlign: "right" }}>{r._count.photos}</td>
                <td>{r.createdBy.name}</td>
                <td><span className={`status ${r.status === "Final" ? "green" : "orange"}`}>{r.status}</span></td>
              </tr>
            ))}
            {reports.length === 0 && <tr><td colSpan={6} className="hint">No QA reports yet — select a job above to start one.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
