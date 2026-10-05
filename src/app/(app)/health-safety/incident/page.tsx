// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { isInstallerProfile } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function IncidentReportsPage() {
  const user = await requireUser();
  const installer = isInstallerProfile(user);
  const reports = await prisma.incidentReport.findMany({
    where: installer ? { submittedById: user.id } : {},
    orderBy: { submittedAt: "desc" },
    take: 200,
    include: { submittedBy: { select: { name: true } } },
  });

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Accident / Incident Reports</h2>
          <div className="subtitle">{installer ? "The reports you've submitted." : "Every accident, injury and near-miss report. Contains health information — handle with care."}</div>
        </div>
        <div className="actions">
          <Link href="/health-safety/incident/new" className="btn primary">New report</Link>
          <Link href="/health-safety" className="btn light">← Health &amp; Safety</Link>
        </div>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Ref</th><th>Date</th><th>Person</th><th>Site</th><th>Outcome</th><th>Reported by</th><th>Status</th></tr></thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/health-safety/incident/${r.id}`} style={{ fontWeight: 800, color: "var(--blueDark)", textDecoration: "none" }}>{r.reference}</Link></td>
                <td>{r.accidentDate.toLocaleDateString("en-NZ")}</td>
                <td>{r.personName}</td>
                <td>{r.siteName}</td>
                <td><span className={`status ${r.notifiable ? "red" : r.outcome === "Near-miss" ? "grey" : "orange"}`}>{r.outcome}</span></td>
                <td>{r.submittedBy.name}</td>
                <td><span className={`status ${r.status === "Closed" ? "green" : "orange"}`}>{r.status}</span></td>
              </tr>
            ))}
            {reports.length === 0 && <tr><td colSpan={7} className="hint">No reports yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
