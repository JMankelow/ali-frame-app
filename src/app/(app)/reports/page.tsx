import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getXeroConnectionStatus } from "@/lib/xero";
import { getProfitAndLoss, getBalanceSheet, getBudgetSummary, type ParsedReport } from "@/lib/xeroReports";

// NZ standard financial year: 1 April – 31 March. "FY2027" means the year
// ending 31 March 2027 — matches how Jo referred to it ("Budget vs Actual
// for 2027 financial year").
function currentFinancialYear(): { from: Date; to: Date; label: string } {
  const now = new Date();
  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1; // April = month 3
  return {
    from: new Date(Date.UTC(fyStartYear, 3, 1)),
    to: new Date(Date.UTC(fyStartYear + 1, 2, 31)),
    label: `FY${fyStartYear + 1}`,
  };
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

export default async function ReportsPage() {
  await requireUser();
  const connection = await getXeroConnectionStatus();

  if (!connection) {
    return (
      <div>
        <div className="topbar">
          <div>
            <h2>Reports</h2>
            <div className="subtitle">Profit &amp; Loss, Balance Sheet and Budget vs Actual, live from Xero.</div>
          </div>
        </div>
        <div className="card">
          <p>Xero isn&apos;t connected yet.</p>
          <div className="actions" style={{ marginTop: 12 }}>
            <Link href="/sync/xero" className="btn primary">
              Connect Xero
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { from, to, label } = currentFinancialYear();
  const today = new Date();

  async function safe(fn: () => Promise<ParsedReport>): Promise<{ report: ParsedReport | null; error: string }> {
    try {
      return { report: await fn(), error: "" };
    } catch (err) {
      return { report: null, error: err instanceof Error ? err.message : "Could not load this report from Xero." };
    }
  }

  const [pnl, balanceSheet, budget] = await Promise.all([
    safe(() => getProfitAndLoss(from, to)),
    safe(() => getBalanceSheet(today)),
    safe(() => getBudgetSummary(from, to)),
  ]);

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Reports</h2>
          <div className="subtitle">
            {label} ({from.toLocaleDateString("en-NZ")} – {to.toLocaleDateString("en-NZ")}), live from{" "}
            {connection.tenantName}.
          </div>
        </div>
      </div>

      <ReportTable title="Profit & Loss" report={pnl.report} error={pnl.error} />
      <ReportTable title={`Balance Sheet as at ${today.toLocaleDateString("en-NZ")}`} report={balanceSheet.report} error={balanceSheet.error} />
      <ReportTable title="Budget vs Actual" report={budget.report} error={budget.error} />
    </div>
  );
}
