import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getXeroConnectionStatus } from "@/lib/xero";
import { getProfitAndLoss } from "@/lib/xeroReports";

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

export default async function ReportsPage() {
  await requireUser();
  const connection = await getXeroConnectionStatus();

  if (!connection) {
    return (
      <div>
        <div className="topbar">
          <div>
            <h2>Reports</h2>
            <div className="subtitle">Profit &amp; Loss, and later Balance Sheet / Budget vs Actual, from Xero.</div>
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
  let report;
  let loadError = "";
  try {
    report = await getProfitAndLoss(from, to);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Could not load the report from Xero.";
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Reports</h2>
          <div className="subtitle">
            Profit &amp; Loss for {label} ({from.toLocaleDateString("en-NZ")} – {to.toLocaleDateString("en-NZ")}),
            live from {connection.tenantName}.
          </div>
        </div>
      </div>

      {loadError && <div className="authError">{loadError}</div>}

      {report && (
        <div className="card">
          <table>
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
        </div>
      )}

      <div className="notice" style={{ marginTop: 16 }}>
        Balance Sheet, Aged Payables/Receivables and Budget vs Actual are next — Profit &amp; Loss is live first so we
        can confirm the numbers match before building the rest out.
      </div>
    </div>
  );
}
