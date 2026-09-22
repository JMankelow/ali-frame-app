import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getXeroConnectionStatus } from "@/lib/xero";
import { getProfitAndLoss, getBalanceSheet, getBankSummary, type ParsedReport } from "@/lib/xeroReports";
import { getWipJobs } from "@/lib/wip";
import { PostWipButton } from "./PostWipButton";

function money(v: number): string {
  return v.toLocaleString("en-NZ", { style: "currency", currency: "NZD" });
}

function ReportTable({ title, report, error }: { title: string; report: ParsedReport | null; error: string }) {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="label">{title}</div>
      {error && (
        <div className="authError" style={{ marginTop: 8 }}>
          {error}
        </div>
      )}
      {report && (
        <table style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>{report.title || title}</th>
              {report.columnLabels.map((c, i) => (
                <th key={i}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.rows.map((r, i) => (
              <tr key={i} style={r.isSummary ? { fontWeight: 800 } : undefined}>
                <td style={{ whiteSpace: "pre" }}>{r.label}</td>
                {r.values.map((v, j) => (
                  <td key={j}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default async function MonthlyManagementReportPage() {
  const user = await requireUser();
  const connection = await getXeroConnectionStatus();

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const cashflowStart = new Date(now);
  cashflowStart.setMonth(cashflowStart.getMonth() - 3);

  const [wipJobs, pastSnapshots] = await Promise.all([
    getWipJobs(),
    prisma.wipSnapshot.findMany({ orderBy: { snapshotDate: "desc" }, take: 12 }),
  ]);
  const residentialJobs = wipJobs.filter((j) => j.type === "RESIDENTIAL");
  const commercialJobs = wipJobs.filter((j) => j.type === "COMMERCIAL");
  const residentialTotal = residentialJobs.reduce((sum, j) => sum + (j.costing?.quotedTotal ?? 0), 0);
  const commercialTotal = commercialJobs.reduce((sum, j) => sum + (j.costing?.quotedTotal ?? 0), 0);

  if (!connection) {
    return (
      <div>
        <div className="topbar">
          <div>
            <h2>Monthly Management Report</h2>
            <div className="subtitle">Profit &amp; Loss, Balance Sheet, Cashflow and Residential/Commercial WIP in one place.</div>
          </div>
        </div>
        <div className="notice">Xero isn&apos;t connected yet — Profit &amp; Loss, Balance Sheet and Cashflow need that first.</div>
        <div className="actions" style={{ marginTop: 12 }}>
          <Link href="/sync/xero" className="btn primary">
            Connect Xero
          </Link>
        </div>
      </div>
    );
  }

  async function safe(fn: () => Promise<ParsedReport>): Promise<{ report: ParsedReport | null; error: string }> {
    try {
      return { report: await fn(), error: "" };
    } catch (err) {
      return { report: null, error: err instanceof Error ? err.message : "Could not load this report from Xero." };
    }
  }

  const [pnl, balanceSheet, cashflow] = await Promise.all([
    safe(() => getProfitAndLoss(monthStart, now)),
    safe(() => getBalanceSheet(now)),
    safe(() => getBankSummary(cashflowStart, now)),
  ]);

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Monthly Management Report</h2>
          <div className="subtitle">
            {now.toLocaleDateString("en-NZ", { month: "long", year: "numeric" })} — live from {connection.tenantName}.
          </div>
        </div>
      </div>

      <ReportTable title={`Profit & Loss (${monthStart.toLocaleDateString("en-NZ")} – ${now.toLocaleDateString("en-NZ")})`} report={pnl.report} error={pnl.error} />
      <ReportTable title={`Balance Sheet as at ${now.toLocaleDateString("en-NZ")}`} report={balanceSheet.report} error={balanceSheet.error} />
      <ReportTable title="Cashflow (Bank Summary, last 3 months)" report={cashflow.report} error={cashflow.error} />

      <div className="card" style={{ marginTop: 16 }}>
        <div className="topbar" style={{ marginBottom: 8 }}>
          <div className="label">Work In Progress — Accepted through Install Confirmed</div>
          <div className="metric" style={{ fontSize: 20 }}>{money(residentialTotal + commercialTotal)}</div>
        </div>
        <div className="hint" style={{ marginBottom: 8 }}>
          Residential {money(residentialTotal)} ({residentialJobs.length} jobs) — Commercial {money(commercialTotal)} (
          {commercialJobs.length} jobs). Jobs currently at: Accepted, Deposit Sent (Awaiting Deposit), Check Measure,
          Joinery Ordered, or Install Confirmed.
        </div>
        <table>
          <thead>
            <tr>
              <th>Job</th>
              <th>Client</th>
              <th>Type</th>
              <th>Status</th>
              <th>Quoted Total</th>
            </tr>
          </thead>
          <tbody>
            {wipJobs.map((j) => (
              <tr key={j.number}>
                <td>
                  <Link href={`/jobs/${j.number}`} style={{ color: "var(--blueDark)", fontWeight: 800, textDecoration: "none" }}>
                    {j.number}
                  </Link>
                </td>
                <td>{j.client?.name ?? "—"}</td>
                <td>{j.type === "COMMERCIAL" ? "Commercial" : "Residential"}</td>
                <td>
                  <span className="status blue">{j.status}</span>
                </td>
                <td>{j.costing?.quotedTotal != null ? money(j.costing.quotedTotal) : "—"}</td>
              </tr>
            ))}
            {wipJobs.length === 0 && (
              <tr>
                <td colSpan={5} className="hint">
                  No jobs currently at these stages.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {user.isSuperUser && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
            <div className="hint" style={{ marginBottom: 8 }}>
              Posts this WIP split as a DRAFT manual journal in Xero (Residential/Commercial WIP accounts against
              Income in Advance), plus its reversal dated the 1st of next month — nothing is auto-posted, it waits for
              your approval in Xero. Normally runs automatically on the 30th of each month.
            </div>
            <PostWipButton />
          </div>
        )}
      </div>

      {pastSnapshots.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="label">Past WIP Snapshots</div>
          <table style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Residential</th>
                <th>Commercial</th>
                <th>Total</th>
                <th>Xero Journal</th>
              </tr>
            </thead>
            <tbody>
              {pastSnapshots.map((s) => (
                <tr key={s.id}>
                  <td>{s.snapshotDate.toLocaleDateString("en-NZ")}</td>
                  <td>{money(s.residentialTotal)}</td>
                  <td>{money(s.commercialTotal)}</td>
                  <td>{money(s.residentialTotal + s.commercialTotal)}</td>
                  <td>{s.xeroJournalId ? "Created" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
