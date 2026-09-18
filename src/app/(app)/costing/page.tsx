import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

function money(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
}

export default async function CostingPage() {
  await requireUser();

  const jobs = await prisma.job.findMany({
    where: { costing: { isNot: null } },
    include: { costing: true, client: true },
    orderBy: { number: "asc" },
  });

  const rows = jobs
    .filter((j) => j.costing)
    .map((j) => {
      const c = j.costing!;
      const quotedCosts = (c.materialsQuoted ?? 0) + (c.rubbishQuoted ?? 0) + (c.installQuoted ?? 0);
      const actualCosts = (c.materialsActual ?? 0) + (c.rubbishActual ?? 0) + (c.installActual ?? 0);
      return { job: j, costing: c, quotedCosts, actualCosts };
    });

  const totals = rows.reduce(
    (acc, r) => ({
      quotedTotal: acc.quotedTotal + (r.costing.quotedTotal ?? 0),
      marginActual: acc.marginActual + (r.costing.marginActual ?? 0),
      marginProfit: acc.marginProfit + (r.costing.marginProfit ?? 0),
    }),
    { quotedTotal: 0, marginActual: 0, marginProfit: 0 }
  );

  const sorted = [...rows].sort((a, b) => (a.costing.marginPct ?? 999) - (b.costing.marginPct ?? 999));

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Costing &amp; Margin</h2>
          <div className="subtitle">{rows.length} job(s) with costing data, from the real Job Tracking figures.</div>
        </div>
      </div>

      <div className="cards">
        <div className="card">
          <div className="label">Total Quoted</div>
          <div className="metric">{money(totals.quotedTotal)}</div>
        </div>
        <div className="card">
          <div className="label">Total Actual Margin</div>
          <div className="metric">{money(totals.marginActual)}</div>
        </div>
        <div className="card">
          <div className="label">Total Profit</div>
          <div className="metric">{money(totals.marginProfit)}</div>
        </div>
      </div>

      <div className="card">
        <div className="label">Lowest Margin First</div>
        <table style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Job</th>
              <th>Client</th>
              <th>Quoted Total</th>
              <th>Costs (Quoted / Actual)</th>
              <th>Profit</th>
              <th>Margin</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.job.number}>
                <td>
                  <Link href={`/jobs/${r.job.number}`} style={{ color: "var(--blueDark)", fontWeight: 800, textDecoration: "none" }}>
                    {r.job.number}
                  </Link>
                </td>
                <td>{r.job.client?.name ?? "—"}</td>
                <td>{money(r.costing.quotedTotal)}</td>
                <td>
                  {money(r.quotedCosts)} / {money(r.actualCosts)}
                </td>
                <td>{money(r.costing.marginProfit)}</td>
                <td>
                  {r.costing.marginPct != null && (
                    <span className={`status ${r.costing.marginPct < 15 ? "red" : r.costing.marginPct < 25 ? "orange" : "green"}`}>
                      {r.costing.marginPct}%
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="hint">
                  No costing data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
