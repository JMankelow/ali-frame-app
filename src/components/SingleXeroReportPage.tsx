import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getXeroConnectionStatus } from "@/lib/xero";
import type { ParsedReport } from "@/lib/xeroReports";

export async function SingleXeroReportPage({
  title,
  subtitle,
  fetchReport,
}: {
  title: string;
  subtitle: string;
  fetchReport: () => Promise<ParsedReport>;
}) {
  await requireUser();
  const connection = await getXeroConnectionStatus();

  if (!connection) {
    return (
      <div>
        <div className="topbar">
          <div>
            <h2>{title}</h2>
            <div className="subtitle">{subtitle}</div>
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

  let report: ParsedReport | null = null;
  let error = "";
  try {
    report = await fetchReport();
  } catch (err) {
    error = err instanceof Error ? err.message : "Could not load this report from Xero.";
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>{title}</h2>
          <div className="subtitle">{subtitle} Live from {connection.tenantName}.</div>
        </div>
      </div>

      {error && <div className="authError">{error}</div>}

      {report && (
        <div className="card">
          <table>
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
        </div>
      )}
    </div>
  );
}
