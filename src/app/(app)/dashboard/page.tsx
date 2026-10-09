// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import Link from "next/link";
import type { ReactNode } from "react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getXeroConnectionStatus } from "@/lib/xero";
import { isInstallerProfile } from "@/lib/permissions";
import { InstallerDashboard } from "./InstallerDashboard";
import { ReviewAlerts } from "./ReviewAlerts";

const money = (v: number) => v.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
const day = (d: Date | null | undefined) => (d ? d.toLocaleDateString("en-NZ", { day: "numeric", month: "short" }) : "—");

function Kpi({ label, value, hint, href, tone }: { label: string; value: ReactNode; hint?: ReactNode; href?: string; tone?: "red" | "orange" | "green" }) {
  const body = (
    <>
      <div className="label">{label}</div>
      <div className="metric" style={tone === "red" ? { color: "#dc2626" } : undefined}>{value}</div>
      {hint && <div className="hint">{hint}</div>}
    </>
  );
  return href ? (
    <Link href={href} className="card" style={{ textDecoration: "none", color: "inherit" }}>{body}</Link>
  ) : (
    <div className="card">{body}</div>
  );
}

/** Simple horizontal bars (no chart library) — each row is { label, value, text }. */
function Bars({ rows, color = "#0057b8", labelWidth = 64 }: { rows: { label: string; value: number; text: string }[]; color?: string; labelWidth?: number }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div style={{ marginTop: 8 }}>
      {rows.map((r) => (
        <div key={r.label} style={{ display: "grid", gridTemplateColumns: `${labelWidth}px minmax(40px, 1fr) max-content`, gap: 12, alignItems: "center", padding: "3px 0", fontSize: 13 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.label}>{r.label}</span>
          <div style={{ background: "#eef2f7", borderRadius: 6, height: 14 }}>
            <div style={{ width: `${(r.value / max) * 100}%`, background: color, height: 14, borderRadius: 6, minWidth: r.value > 0 ? 4 : 0 }} />
          </div>
          <span style={{ textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>{r.text}</span>
        </div>
      ))}
    </div>
  );
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function DashboardPage() {
  const user = await requireUser();
  if (isInstallerProfile(user)) return <InstallerDashboard userId={user.id} name={user.name} role={user.role} />;
  const isSuper = user.isSuperUser;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7)); // Monday
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const in7 = new Date(now.getTime() + 7 * 86400000);
  const in30 = new Date(now.getTime() + 30 * 86400000);

  const [
    activeJobs, statusGroups, newLeadsWeek, openLeads, quotesWeek, quotesSixMonths, outstandingQuotes, expiringQuotes,
    remedialOpen, remedialMonth, remedialCosting, completedAudit, acceptedCosting, upcomingInstalls, unassignedJobs,
    vehicleIssues, vehiclesDue, pendingChecks, openIncidents, expiredTickets, preStartsToday, hoursWeek, pendingTimesheets,
    myTasks, xero,
  ] = await Promise.all([
    prisma.job.count({ where: { archived: false } }),
    prisma.job.groupBy({ by: ["status"], where: { archived: false }, _count: true, orderBy: { _count: { status: "desc" } } }),
    prisma.lead.count({ where: { createdAt: { gte: startOfWeek } } }),
    prisma.lead.count({ where: { status: "New" } }),
    prisma.quote.findMany({ where: { dateSent: { gte: startOfWeek } }, select: { total: true, dateSent: true, jobReference: true, customerName: true } }),
    prisma.quote.findMany({ where: { dateSent: { gte: sixMonthsAgo } }, select: { dateSent: true, total: true, jobReference: true, customerName: true } }),
    prisma.quote.findMany({ where: { status: "Sent" }, select: { total: true, quoteDate: true, dateSent: true } }),
    prisma.quote.findMany({ where: { status: "Sent", expiryDate: { gte: now, lte: in7 } }, select: { quoteNumber: true, customerName: true, expiryDate: true }, take: 6 }),
    prisma.remedialItem.count({ where: { status: "Open" } }),
    prisma.remedialItem.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.jobCosting.aggregate({ where: { remedialFlag: true }, _count: true, _sum: { remedialCost: true } }),
    prisma.auditLog.findMany({ where: { action: "job_updated", entityType: "Job", createdAt: { gte: startOfMonth } }, select: { entityId: true, createdAt: true, metadata: true } }),
    prisma.jobCosting.findMany({ where: { dateAccepted: { gte: sixMonthsAgo, lte: now } }, select: { dateAccepted: true, quotedTotal: true } }),
    prisma.jobScheduledTask.findMany({
      where: { type: "Installation", scheduledDate: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()), lte: in7 }, status: { not: "Cancelled" } },
      include: { job: { select: { number: true, title: true, address: true } }, assignees: { select: { name: true } } },
      orderBy: { scheduledDate: "asc" },
      take: 8,
    }),
    prisma.job.count({ where: { archived: false, assignedUserId: null } }),
    prisma.vehicleIssue.count({ where: { status: "Open" } }),
    prisma.vehicle.findMany({
      where: { OR: [{ wofDueDate: { lte: in30 } }, { regoDueDate: { lte: in30 } }] },
      select: { name: true, wofDueDate: true, regoDueDate: true },
      take: 8,
    }),
    prisma.vehicleChecklist.count({ where: { status: "Pending" } }),
    prisma.safetyIncident.count({ where: { status: "Open" } }),
    prisma.hsCompetency.count({ where: { active: true, expiryDate: { lt: now } } }),
    prisma.hsPreStart.count({ where: { date: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } } }),
    prisma.timesheetEntry.aggregate({ where: { dateWorked: { gte: startOfWeek } }, _sum: { totalHours: true } }),
    prisma.timesheetEntry.count({ where: { status: { not: "Approved" } } }),
    prisma.note.count({ where: { assignedToId: user.id, status: { not: "Done" } } }),
    isSuper ? getXeroConnectionStatus() : Promise.resolve(null),
  ]);

  // Completed = moved to "Completed" in the app (the status change is recorded in the audit log).
  const completedInMonth = new Map<string, Date>();
  for (const a of completedAudit) {
    const m = a.metadata as { statusTo?: string } | null;
    if (m?.statusTo === "Completed" && a.entityId) completedInMonth.set(a.entityId, a.createdAt);
  }
  const completedWeekNumbers = [...completedInMonth.entries()].filter(([, d]) => d >= startOfWeek).map(([n]) => n);
  const completedWeekCosting = completedWeekNumbers.length
    ? await prisma.job.findMany({
        where: { number: { in: completedWeekNumbers } },
        select: { number: true, title: true, costing: { select: { labourHoursQuoted: true, labourHoursActual: true, installQuoted: true, installActual: true } } },
      })
    : [];
  const budgetRows = completedWeekCosting.map((j) => {
    const c = j.costing;
    const hours = c?.labourHoursQuoted != null && c?.labourHoursActual != null ? { q: c.labourHoursQuoted, a: c.labourHoursActual } : null;
    const install = c?.installQuoted != null && c?.installActual != null ? { q: c.installQuoted, a: c.installActual } : null;
    const known = hours || install;
    const under = known ? (hours ? hours.a <= hours.q : true) && (install ? install.a <= install.q : true) : null;
    return { number: j.number, title: j.title, hours, install, under };
  });
  const underCount = budgetRows.filter((r) => r.under === true).length;
  const overCount = budgetRows.filter((r) => r.under === false).length;

  // Quotes outstanding, aged from the day they were sent: Current (under 30 days), 30 days (30–59), 60+ days.
  const ageBuckets = { current: { n: 0, v: 0 }, d30: { n: 0, v: 0 }, d60: { n: 0, v: 0 } };
  for (const q of outstandingQuotes) {
    const sent = q.dateSent ?? q.quoteDate;
    const days = sent ? Math.floor((now.getTime() - sent.getTime()) / 86400000) : 0;
    const b = days >= 60 ? ageBuckets.d60 : days >= 30 ? ageBuckets.d30 : ageBuckets.current;
    b.n += 1;
    b.v += q.total ?? 0;
  }

  // Quote totals in the register include GST, and a job can have several revisions. For sales figures count each job once
  // (its latest quote) and show the value excluding GST, to match the KPI report.
  const latestPerJob = <T extends { dateSent: Date | null; jobReference: string | null; customerName: string }>(rows: T[]) => {
    const byJob = new Map<string, T>();
    for (const q of rows) {
      const key = q.jobReference?.match(/JOB-(\d+)/i)?.[1] ?? `c:${q.customerName}`;
      const cur = byJob.get(key);
      if (!cur || (q.dateSent?.getTime() ?? 0) > (cur.dateSent?.getTime() ?? 0)) byJob.set(key, q);
    }
    return [...byJob.values()];
  };
  const exGst = (rows: { total: number | null }[]) => rows.reduce((s, r) => s + (r.total ?? 0), 0) / 1.15;
  const quotesWeekJobs = latestPerJob(quotesWeek);

  const sum = (rows: { total: number | null }[]) => rows.reduce((s, r) => s + (r.total ?? 0), 0);
  const acceptedMonth = acceptedCosting.filter((c) => c.dateAccepted && c.dateAccepted >= startOfMonth);
  const salesMonth = acceptedMonth.reduce((s, c) => s + (c.quotedTotal ?? 0), 0);

  const months: string[] = [];
  for (let i = 5; i >= 0; i--) months.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  const monthLabel = (k: string) => new Date(`${k}-01T12:00:00`).toLocaleDateString("en-NZ", { month: "short", year: "2-digit" });
  const salesByMonth = months.map((k) => ({ k, v: acceptedCosting.filter((c) => c.dateAccepted && monthKey(c.dateAccepted) === k).reduce((s, c) => s + (c.quotedTotal ?? 0), 0) }));
  const quotesByMonth = months.map((k) => {
    const rows = latestPerJob(quotesSixMonths.filter((q) => q.dateSent && monthKey(q.dateSent) === k));
    return { k, n: rows.length, v: exGst(rows) };
  });

  const attention: { text: string; href: string; tone?: "red" }[] = [
    ...(expiredTickets ? [{ text: `${expiredTickets} worker ticket(s)/licence(s) past expiry`, href: "/health-safety", tone: "red" as const }] : []),
    ...(openIncidents ? [{ text: `${openIncidents} open safety incident(s)/hazard(s)`, href: "/health-safety", tone: "red" as const }] : []),
    ...(remedialOpen ? [{ text: `${remedialOpen} open remedial item(s)`, href: "/remedial" }] : []),
    ...(vehicleIssues ? [{ text: `${vehicleIssues} open vehicle issue(s)`, href: "/vehicles" }] : []),
    ...(pendingChecks ? [{ text: `${pendingChecks} vehicle check(s) not yet completed`, href: "/vehicles" }] : []),
    ...(unassignedJobs ? [{ text: `${unassignedJobs} active job(s) with no one assigned`, href: "/jobs" }] : []),
    ...(pendingTimesheets ? [{ text: `${pendingTimesheets} timesheet entr${pendingTimesheets === 1 ? "y" : "ies"} awaiting approval`, href: "/timesheets" }] : []),
    ...(preStartsToday === 0 ? [{ text: "No daily toolbox recorded yet today", href: "/health-safety" }] : []),
    ...expiringQuotes.map((q) => ({ text: `Quote ${q.quoteNumber} (${q.customerName}) expires ${day(q.expiryDate)}`, href: "/quotes" })),
  ];

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Dashboard</h2>
          <div className="subtitle">Welcome back, {user.name.split(" ")[0]}. {now.toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" })}.</div>
        </div>
        <Link href="/policies" className="btn light">Company Policies</Link>
      </div>

      <ReviewAlerts userId={user.id} />

      <div className="cards">
        <Kpi label="Active Jobs" value={activeJobs} hint={`${unassignedJobs} unassigned`} href="/jobs" />
        <Kpi label="Jobs Completed — This Month" value={completedInMonth.size} hint={`${completedWeekNumbers.length} this week`} href="/jobs" />
        <Kpi label="Quotes Sent — This Week" value={quotesWeekJobs.length} hint={isSuper ? `${money(exGst(quotesWeekJobs))} quoted excl. GST` : undefined} href="/quotes" />
        <Kpi label="New Leads — This Week" value={newLeadsWeek} hint={`${openLeads} still new`} href="/leads" />
        <Kpi label="Remedial Recorded — This Month" value={remedialMonth} hint={`${remedialOpen} open · ${remedialCosting._count} on tracked jobs`} href="/remedial" tone={remedialOpen > 0 ? "red" : undefined} />
        <Kpi label="Hours Logged — This Week" value={(hoursWeek._sum.totalHours ?? 0).toFixed(0)} hint={`${pendingTimesheets} awaiting approval`} href="/timesheets" />
      </div>

      {isSuper && (
        <div className="cards" style={{ marginTop: 16 }}>
          <Kpi label="Sales Accepted — This Month" value={money(salesMonth)} hint={`${acceptedMonth.length} job(s) accepted`} href="/costing" />
          <Link href="/quotes" className="card" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="label">Quotes Outstanding</div>
            <div className="metric">{money(sum(outstandingQuotes))}</div>
            <div className="hint" style={{ marginBottom: 8 }}>{outstandingQuotes.length} awaiting a decision</div>
            <table style={{ fontSize: 13 }}>
              <tbody>
                {([
                  ["Current", ageBuckets.current, "green"],
                  ["30 days", ageBuckets.d30, "orange"],
                  ["60+ days", ageBuckets.d60, "red"],
                ] as const).map(([label, b, tone]) => (
                  <tr key={label}>
                    <td><span className={`status ${tone}`}>{label}</span></td>
                    <td style={{ textAlign: "right" }}>{b.n}</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{money(b.v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Link>
          <Kpi label="Jobs Under Budget — This Week" value={`${underCount} / ${underCount + overCount}`} hint={overCount ? `${overCount} over budget` : "of jobs completed with figures"} href="/costing" tone={overCount ? "red" : undefined} />
          <Kpi label="Remedial Cost (tracked jobs)" value={money(remedialCosting._sum.remedialCost ?? 0)} hint={`${remedialCosting._count} job(s) with remedial`} href="/costing" />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16, marginTop: 16 }}>
        {isSuper && (
          <div className="card">
            <div className="label">Sales accepted by month</div>
            <Bars rows={salesByMonth.map((m) => ({ label: monthLabel(m.k), value: m.v, text: money(m.v) }))} color="#16a34a" />
          </div>
        )}
        <div className="card">
          <div className="label">Quotes sent by month</div>
          <div className="hint">One quote per job (latest revision), excl. GST</div>
          <Bars rows={quotesByMonth.map((m) => ({ label: monthLabel(m.k), value: m.n, text: isSuper ? `${m.n} · ${money(m.v)}` : String(m.n) }))} />
        </div>
        <div className="card">
          <div className="label">Active jobs by status</div>
          <Bars rows={statusGroups.slice(0, 10).map((s) => ({ label: s.status, value: s._count, text: String(s._count) }))} color="#7c3aed" labelWidth={150} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16, marginTop: 16 }}>
        <div className="card">
          <div className="label">Installs in the next 7 days</div>
          <table style={{ marginTop: 8 }}>
            <tbody>
              {upcomingInstalls.map((t) => (
                <tr key={t.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{day(t.scheduledDate)}</td>
                  <td><Link href={`/jobs/${t.job.number}`} style={{ fontWeight: 600, color: "var(--blueDark)", textDecoration: "none" }}>{t.job.number} — {t.job.title}</Link><div className="hint">{t.job.address ?? ""}</div></td>
                  <td className="hint">{t.assignees.map((a) => a.name).join(", ") || "Unassigned"}</td>
                </tr>
              ))}
              {upcomingInstalls.length === 0 && <tr><td className="hint">No installs booked in the next week.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="label">Needs attention</div>
          {attention.length === 0 ? (
            <div className="hint" style={{ marginTop: 8 }}>Nothing outstanding.</div>
          ) : (
            <ul style={{ marginTop: 8, paddingLeft: 18 }}>
              {attention.map((a, i) => (
                <li key={i}><Link href={a.href} style={{ color: a.tone === "red" ? "#dc2626" : "inherit", textDecoration: "none", fontWeight: a.tone === "red" ? 700 : 400 }}>{a.text}</Link></li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="label">Vehicles — WOF / rego due within 30 days</div>
          <table style={{ marginTop: 8 }}>
            <tbody>
              {vehiclesDue.map((v) => (
                <tr key={v.name}>
                  <td style={{ fontWeight: 600 }}>{v.name}</td>
                  <td className="hint">WOF {day(v.wofDueDate)}{v.wofDueDate && v.wofDueDate < now ? " (overdue)" : ""}</td>
                  <td className="hint">Rego {day(v.regoDueDate)}{v.regoDueDate && v.regoDueDate < now ? " (overdue)" : ""}</td>
                </tr>
              ))}
              {vehiclesDue.length === 0 && <tr><td className="hint">Nothing due.</td></tr>}
            </tbody>
          </table>
        </div>

        {isSuper && (
          <div className="card">
            <div className="label">Completed this week — budget check</div>
            <div className="hint" style={{ marginTop: 4 }}>Under budget = actual labour hours and install cost at or below quoted.</div>
            <table style={{ marginTop: 8 }}>
              <tbody>
                {budgetRows.map((r) => (
                  <tr key={r.number}>
                    <td><Link href={`/jobs/${r.number}`} style={{ fontWeight: 600, color: "var(--blueDark)", textDecoration: "none" }}>{r.number}</Link></td>
                    <td className="hint">{r.hours ? `${r.hours.a}h of ${r.hours.q}h` : "—"}</td>
                    <td>{r.under == null ? <span className="status grey">No figures</span> : <span className={`status ${r.under ? "green" : "red"}`}>{r.under ? "Under" : "Over"}</span>}</td>
                  </tr>
                ))}
                {budgetRows.length === 0 && <tr><td className="hint">No jobs marked Completed this week yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="cards" style={{ marginTop: 16 }}>
        <Kpi label="My Open Tasks" value={myTasks} href="/tasks" />
        <Kpi label="Open Vehicle Issues" value={vehicleIssues} href="/vehicles" />
        <Kpi label="Open Safety Incidents" value={openIncidents} href="/health-safety" tone={openIncidents ? "red" : undefined} />
        <Kpi label="Toolboxes Today" value={preStartsToday} href="/health-safety" />
      </div>

      {isSuper && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="topbar" style={{ marginBottom: 0 }}>
            <div className="label">Xero</div>
            {xero ? (
              <span className="status green">Connected — {xero.tenantName}</span>
            ) : (
              <Link href="/sync/xero" className="btn primary">Connect Xero</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
