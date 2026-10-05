// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import Link from "next/link";
import { requireSuperUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { jobStatusStyle } from "@/lib/statusColors";

function money(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
}

// Accepted-or-later job statuses: used for jobs with no recorded accepted date, but only when looking at today.
const ACCEPTED_STATUSES = [
  "Quote Accepted",
  "Check Measure Required",
  "Final Check Measure Complete",
  "Joinery Ordered",
  "Deposit Invoice Sent",
  "Installation Date Confirmed",
  "Commercial Acceptance",
  "In Progress",
  "Remedial Work Required",
];
const DEAD_STATUSES = ["No Go", "Declined/No Go"];
const COMPLETE_STATUSES = ["Completed", "Complete"];

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const nz = (d: Date) => d.toLocaleDateString("en-NZ", { day: "2-digit", month: "2-digit", year: "numeric" });

/** WIP = accepted on or before the date, and not yet completed by that date. Pick any date — typically a month end. */
export default async function WipPage({ searchParams }: { searchParams: Promise<{ asAt?: string }> }) {
  await requireSuperUser();
  const { asAt: asAtRaw } = await searchParams;

  const today = new Date();
  const parsed = asAtRaw && /^\d{4}-\d{2}-\d{2}$/.test(asAtRaw) ? new Date(`${asAtRaw}T00:00:00`) : null;
  const asAt = parsed ?? new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(asAt.getFullYear(), asAt.getMonth(), asAt.getDate(), 23, 59, 59, 999);
  const isToday = ymd(asAt) >= ymd(today);

  const [jobs, completedAudit] = await Promise.all([
    prisma.job.findMany({
      where: {
        status: { notIn: DEAD_STATUSES },
        OR: [{ costing: { dateAccepted: { lte: end } } }, ...(isToday ? [{ status: { in: ACCEPTED_STATUSES } }] : [])],
      },
      include: {
        costing: true,
        client: true,
        scheduledTasks: { where: { type: "Installation", status: { not: "Cancelled" } }, select: { scheduledDate: true, endDate: true } },
      },
      orderBy: { number: "asc" },
    }),
    prisma.auditLog.findMany({
      where: { action: "job_updated", entityType: "Job", metadata: { path: ["statusTo"], equals: "Completed" } },
      select: { entityId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const completedAuditAt = new Map<string, Date>();
  for (const a of completedAudit) if (a.entityId) completedAuditAt.set(a.entityId, a.createdAt);

  let unknownCompletion = 0;
  const wip = jobs.filter((j) => {
    if (COMPLETE_STATUSES.includes(j.status)) {
      // Completion date: when it was marked Completed in the app, else the end of its last install booking.
      const lastInstall = j.scheduledTasks.map((t) => t.endDate ?? t.scheduledDate).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
      const completedAt = completedAuditAt.get(j.number) ?? lastInstall;
      if (!completedAt) {
        unknownCompletion += 1;
        return false; // no date to go on — treated as already completed
      }
      return completedAt > end; // still in progress on the chosen date
    }
    // Not completed now: it was certainly in progress on any date after it was accepted.
    return true;
  });

  const quotedTotal = wip.reduce((sum, j) => sum + (j.costing?.quotedTotal ?? 0), 0);
  const depositTotal = wip.reduce((sum, j) => sum + (j.costing?.deposit ?? 0), 0);

  // Quick picks: the last six month ends (plus today).
  const monthEnds: Date[] = [];
  for (let i = 0; i < 6; i++) monthEnds.push(new Date(today.getFullYear(), today.getMonth() - i, 0));

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>WIP Report</h2>
          <div className="subtitle">
            {wip.length} job(s) in progress as at <b>{nz(asAt)}</b> — accepted on or before that date and not yet completed.
          </div>
        </div>
      </div>

      <form method="get" className="card" style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
        <div>
          <label htmlFor="asAt">As at date (e.g. a month end)</label>
          <input id="asAt" type="date" name="asAt" defaultValue={ymd(asAt)} />
        </div>
        <button type="submit" className="btn primary">Show WIP</button>
        <div className="actions">
          <Link href="/wip" className="btn light">Today</Link>
          {monthEnds.map((d) => (
            <Link key={d.getTime()} href={`/wip?asAt=${ymd(d)}`} className="btn light">
              {String(d.getDate()).padStart(2, "0")}.{String(d.getMonth() + 1).padStart(2, "0")}
            </Link>
          ))}
        </div>
      </form>

      <div className="cards" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="label">WIP Jobs</div>
          <div className="metric">{wip.length}</div>
        </div>
        <div className="card">
          <div className="label">Quoted Value in Progress (excl. GST)</div>
          <div className="metric">{money(quotedTotal)}</div>
        </div>
        <div className="card">
          <div className="label">Deposits Held</div>
          <div className="metric">{money(depositTotal)}</div>
        </div>
      </div>

      {unknownCompletion > 0 && (
        <div className="hint" style={{ marginBottom: 10 }}>
          {unknownCompletion} completed job(s) have no completion date recorded (not marked Completed in the app and no install booking), so they&apos;re treated as completed before this date.
          Status shown is each job&apos;s status today.
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Job</th>
              <th>Client</th>
              <th>Status</th>
              <th>Accepted</th>
              <th>Quoted Total</th>
              <th>Deposit</th>
              <th>Supplier</th>
              <th>PO</th>
            </tr>
          </thead>
          <tbody>
            {wip.map((j) => (
              <tr key={j.number}>
                <td>
                  <Link href={`/jobs/${j.number}`} style={{ color: "var(--blueDark)", fontWeight: 800, textDecoration: "none" }}>
                    {j.number}
                  </Link>
                </td>
                <td>{j.client?.name ?? j.title}</td>
                <td>
                  <span className="status blue" style={jobStatusStyle(j.status)}>{j.status}</span>
                </td>
                <td>{j.costing?.dateAccepted ? nz(j.costing.dateAccepted) : "—"}</td>
                <td>{money(j.costing?.quotedTotal)}</td>
                <td>{money(j.costing?.deposit)}</td>
                <td>{j.supplier ?? "—"}</td>
                <td>{j.poNumber ?? "—"}</td>
              </tr>
            ))}
            {wip.length === 0 && (
              <tr>
                <td colSpan={8} className="hint">
                  No jobs in progress at this date.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
