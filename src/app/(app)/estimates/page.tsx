import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { EstimateForm } from "./EstimateForm";

const STATUS_COLOR: Record<string, string> = {
  Quoted: "blue",
  "Awaiting Reply": "orange",
  Accepted: "green",
  Declined: "grey",
};

export default async function EstimatesPage() {
  await requireUser();

  const estimates = await prisma.estimate.findMany({ orderBy: { dateReceived: "desc" } });

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Estimates</h2>
          <div className="subtitle">{estimates.length} estimate(s) — imported from real customer enquiries, plus anything added here since.</div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Category</th>
              <th>Size</th>
              <th>Estimated Cost</th>
              <th>Status</th>
              <th>Received</th>
            </tr>
          </thead>
          <tbody>
            {estimates.map((e) => (
              <tr key={e.id}>
                <td>
                  <Link href={`/estimates/${e.id}`} style={{ fontWeight: 800, color: "var(--blueDark)", textDecoration: "none", display: "block" }}>
                    {e.clientName}
                  </Link>
                  <div className="hint">{e.address}</div>
                </td>
                <td>{e.category ?? "—"}</td>
                <td>{e.size ?? (e.widthMM && e.heightMM ? `${e.widthMM} x ${e.heightMM}mm` : "—")}</td>
                <td>{e.estimatedCostText ?? "—"}</td>
                <td>
                  <span className={`status ${STATUS_COLOR[e.status] ?? "grey"}`}>{e.status}</span>
                </td>
                <td>{e.dateReceived ? e.dateReceived.toLocaleDateString("en-NZ") : "—"}</td>
              </tr>
            ))}
            {estimates.length === 0 && (
              <tr>
                <td colSpan={6} className="hint">
                  No estimates yet — add the first one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <EstimateForm />
    </div>
  );
}
