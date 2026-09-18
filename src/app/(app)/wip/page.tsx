import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

function money(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
}

export default async function WipPage() {
  await requireUser();

  const jobs = await prisma.job.findMany({
    where: { archived: false, status: { not: "Complete" } },
    include: { costing: true, client: true },
    orderBy: { number: "asc" },
  });

  const quotedTotal = jobs.reduce((sum, j) => sum + (j.costing?.quotedTotal ?? 0), 0);
  const depositTotal = jobs.reduce((sum, j) => sum + (j.costing?.deposit ?? 0), 0);

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>WIP Report</h2>
          <div className="subtitle">{jobs.length} job(s) currently in progress (not Complete, not archived).</div>
        </div>
      </div>

      <div className="cards">
        <div className="card">
          <div className="label">WIP Jobs</div>
          <div className="metric">{jobs.length}</div>
        </div>
        <div className="card">
          <div className="label">Quoted Value in Progress</div>
          <div className="metric">{money(quotedTotal)}</div>
        </div>
        <div className="card">
          <div className="label">Deposits Held</div>
          <div className="metric">{money(depositTotal)}</div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Job</th>
              <th>Client</th>
              <th>Status</th>
              <th>Quoted Total</th>
              <th>Deposit</th>
              <th>Supplier</th>
              <th>PO</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.number}>
                <td>
                  <Link href={`/jobs/${j.number}`} style={{ color: "var(--blueDark)", fontWeight: 800, textDecoration: "none" }}>
                    {j.number}
                  </Link>
                </td>
                <td>{j.client?.name ?? "—"}</td>
                <td>
                  <span className="status blue">{j.status}</span>
                </td>
                <td>{money(j.costing?.quotedTotal)}</td>
                <td>{money(j.costing?.deposit)}</td>
                <td>{j.supplier ?? "—"}</td>
                <td>{j.poNumber ?? "—"}</td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={7} className="hint">
                  No jobs currently in progress.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
