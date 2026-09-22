import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getXeroConnectionStatus } from "@/lib/xero";
import { getProfitAndLoss, type ParsedReport } from "@/lib/xeroReports";

function financialYearFor(fyStartYear: number): { from: Date; to: Date; label: string } {
  return {
    from: new Date(Date.UTC(fyStartYear, 3, 1)),
    to: new Date(Date.UTC(fyStartYear + 1, 2, 31)),
    label: `FY${fyStartYear + 1}`,
  };
}

function currentFinancialYearStart(): number {
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
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

export default async function ProfitAndLossPage({
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
            <h2>Profit &amp; Loss</h2>
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

  let report: ParsedReport | null = null;
  let error = "";
  try {
    report = await getProfitAndLoss(pnlRange.from, pnlRange.to);
  } catch (err) {
    error = err instanceof Error ? err.message : "Could not load this report from Xero.";
  }

  const rangeTab = (key: PnlRangeKey) => (
    <Link key={key} href={`/reports/profit-loss?range=${key}`} className={`btn ${pnlRange.key === key ? "primary" : "light"}`}>
      {PNL_RANGE_LABELS[key]}
    </Link>
  );

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Profit &amp; Loss</h2>
          <div className="subtitle">Live from {connection.tenantName}.</div>
        </div>
      </div>

      <div className="card">
        <div className="actions" style={{ marginBottom: 4 }}>
          {(["this-month", "last-month", "this-fy", "last-fy"] as PnlRangeKey[]).map(rangeTab)}
        </div>
        <form action="/reports/profit-loss" className="actions" style={{ marginTop: 8, alignItems: "flex-end" }}>
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
        {error && (
          <div className="authError" style={{ marginTop: 8 }}>
            {error}
          </div>
        )}
        {report && (
          <table style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>{report.title || "Profit & Loss"}</th>
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
    </div>
  );
}
