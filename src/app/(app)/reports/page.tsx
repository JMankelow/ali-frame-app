import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getXeroConnectionStatus } from "@/lib/xero";
import { getProfitAndLoss, getBalanceSheet, getBudgetSummary, type ParsedReport } from "@/lib/xeroReports";

// NZ standard financial year: 1 April – 31 March. "FY2027" means the year
// ending 31 March 2027 — matches how Jo referred to it ("Budget vs Actual
// for 2027 financial year").
function financialYearFor(fyStartYear: number): { from: Date; to: Date; label: string } {
  return {
    from: new Date(Date.UTC(fyStartYear, 3, 1)),
    to: new Date(Date.UTC(fyStartYear + 1, 2, 31)),
    label: `FY${fyStartYear + 1}`,
  };
}

function currentFinancialYearStart(): number {
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1; // April = month 3
}

type PnlRangeKey = "this-month" | "last-month" | "this-fy" | "last-fy" | "custom";

const PNL_RANGE_LABELS: Record<PnlRangeKey, string> = {
  "this-month": "This Month",
  "last-month": "Last Month",
  "this-fy": "This Financial Year",
  "last-fy": "Last Financial Year",
  custom: "Custom",
};

function resolvePnlRange(range: string | undefined, customFrom: string | undefined, customTo: string | undefined) {
  const now = new Date();
  const key: PnlRangeKey = (range as PnlRangeKey) in PNL_RANGE_LABELS ? (range as PnlRangeKey) : "this-fy";

  if (key === "this-month") {
    return { from: new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)), to: now, key, label: PNL_RANGE_LABELS[key] };
  }
  if (key === "last-month") {
    const from = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));
    const to = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0));
    return { from, to, key, label: PNL_RANGE_LABELS[key] };
  }
  if (key === "last-fy") {
    const { from, to, label } = financialYearFor(currentFinancialYearStart() - 1);
    return { from, to, key, label: `Last Financial Year (${label})` };
  }
  if (key === "custom" && customFrom && customTo) {
    const from = new Date(customFrom);
    const to = new Date(customTo);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
      return { from, to, key, label: PNL_RANGE_LABELS[key] };
    }
  }
  const { from, to, label } = financialYearFor(currentFinancialYearStart());
  return { from, to, key: "this-fy" as PnlRangeKey, label: `This Financial Year (${label})` };
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

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  await requireUser();
  const connection = await getXeroConnectionStatus();
  const { range, from: customFrom, to: customTo } = await searchParams;

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

  const pnlRange = resolvePnlRange(range, customFrom, customTo);
  const { from: fyFrom, to: fyTo, label: fyLabel } = financialYearFor(currentFinancialYearStart());
  const today = new Date();

  async function safe(fn: () => Promise<ParsedReport>): Promise<{ report: ParsedReport | null; error: string }> {
    try {
      return { report: await fn(), error: "" };
    } catch (err) {
      return { report: null, error: err instanceof Error ? err.message : "Could not load this report from Xero." };
    }
  }

  const [pnl, balanceSheet, budget] = await Promise.all([
    safe(() => getProfitAndLoss(pnlRange.from, pnlRange.to)),
    safe(() => getBalanceSheet(today)),
    safe(() => getBudgetSummary(fyFrom, fyTo)),
  ]);

  const rangeTab = (key: PnlRangeKey) => (
    <Link
      key={key}
      href={`/reports?range=${key}`}
      className={`btn ${pnlRange.key === key ? "primary" : "light"}`}
    >
      {PNL_RANGE_LABELS[key]}
    </Link>
  );

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Reports</h2>
          <div className="subtitle">Live from {connection.tenantName}.</div>
        </div>
      </div>

      <div className="card">
        <div className="label">Profit &amp; Loss</div>
        <div className="actions" style={{ marginTop: 10, marginBottom: 4 }}>
          {(["this-month", "last-month", "this-fy", "last-fy"] as PnlRangeKey[]).map(rangeTab)}
        </div>
        <form action="/reports" className="actions" style={{ marginTop: 8, alignItems: "flex-end" }}>
          <input type="hidden" name="range" value="custom" />
          <div>
            <label className="hint">From</label>
            <input type="date" name="from" defaultValue={pnlRange.key === "custom" ? customFrom : undefined} />
          </div>
          <div>
            <label className="hint">To</label>
            <input type="date" name="to" defaultValue={pnlRange.key === "custom" ? customTo : undefined} />
          </div>
          <button type="submit" className={`btn ${pnlRange.key === "custom" ? "primary" : "light"}`}>
            Custom Range
          </button>
        </form>
        <div className="hint" style={{ marginTop: 10 }}>
          Showing {pnlRange.label}: {pnlRange.from.toLocaleDateString("en-NZ")} – {pnlRange.to.toLocaleDateString("en-NZ")}
        </div>
        {pnl.error && (
          <div className="authError" style={{ marginTop: 8 }}>
            {pnl.error}
          </div>
        )}
        {pnl.report && (
          <table style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>{pnl.report.title || "Profit & Loss"}</th>
                {pnl.report.columnLabels.map((c, i) => (
                  <th key={i}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pnl.report.rows.map((r, i) => (
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

      <ReportTable title={`Balance Sheet as at ${today.toLocaleDateString("en-NZ")}`} report={balanceSheet.report} error={balanceSheet.error} />
      <ReportTable title={`Budget vs Actual (${fyLabel})`} report={budget.report} error={budget.error} />
    </div>
  );
}
