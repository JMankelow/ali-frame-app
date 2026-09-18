import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getXeroConnectionStatus } from "@/lib/xero";
import { getBankSummary } from "@/lib/xeroReports";

export default async function CashflowPage() {
  await requireUser();
  const connection = await getXeroConnectionStatus();

  if (!connection) {
    return (
      <div>
        <div className="topbar">
          <div>
            <h2>Cashflow</h2>
            <div className="subtitle">Bank account movements, live from Xero.</div>
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

  const to = new Date();
  const from = new Date(to);
  from.setMonth(from.getMonth() - 3);

  let report;
  let loadError = "";
  try {
    report = await getBankSummary(from, to);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Could not load the Bank Summary from Xero.";
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Cashflow</h2>
          <div className="subtitle">
            Bank Summary, last 3 months ({from.toLocaleDateString("en-NZ")} – {to.toLocaleDateString("en-NZ")}), live
            from {connection.tenantName}.
          </div>
        </div>
      </div>

      {loadError && <div className="authError">{loadError}</div>}

      {report && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>{report.title || "Bank Summary"}</th>
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
    </div>
  );
}
