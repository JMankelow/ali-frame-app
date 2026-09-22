import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { acceptQuote } from "./actions";

const STATUS_COLOR: Record<string, string> = {
  Sent: "blue",
  Accepted: "green",
  Expired: "grey",
};

function money(v: number | null): string {
  if (v == null) return "—";
  return v.toLocaleString("en-NZ", { style: "currency", currency: "NZD" });
}

export default async function QuotesPage() {
  await requireUser();
  const quotes = await prisma.quote.findMany({ orderBy: { quoteDate: "desc" } });

  const today = new Date();
  const openTotal = quotes.filter((q) => q.status !== "Accepted").reduce((sum, q) => sum + (q.total ?? 0), 0);

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Quote Register</h2>
          <div className="subtitle">{quotes.length} quote(s) — Declined quotes are excluded entirely. Once a quote&apos;s expiry date passes, it can no longer be accepted.</div>
        </div>
      </div>

      <div className="cards">
        <div className="card">
          <div className="label">Open Quote Value</div>
          <div className="metric">{money(openTotal)}</div>
        </div>
        <div className="card">
          <div className="label">Accepted</div>
          <div className="metric">{quotes.filter((q) => q.status === "Accepted").length}</div>
        </div>
        <div className="card">
          <div className="label">Expired</div>
          <div className="metric">{quotes.filter((q) => q.status === "Expired").length}</div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Quote No.</th>
              <th>Customer</th>
              <th>Job</th>
              <th>Total</th>
              <th>Status</th>
              <th>Quote Date</th>
              <th>Expiry Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => {
              const isExpired = q.expiryDate ? q.expiryDate < today : false;
              return (
                <tr key={q.id}>
                  <td>{q.quoteNumber}</td>
                  <td>{q.customerName}</td>
                  <td>
                    {q.jobNumber ? (
                      <Link href={`/jobs/${q.jobNumber}`} style={{ color: "var(--blueDark)", fontWeight: 800, textDecoration: "none" }}>
                        {q.jobNumber}
                      </Link>
                    ) : (
                      q.jobReference ?? "—"
                    )}
                  </td>
                  <td>{money(q.total)}</td>
                  <td>
                    <span className={`status ${STATUS_COLOR[isExpired && q.status !== "Accepted" ? "Expired" : q.status] ?? "grey"}`}>
                      {isExpired && q.status !== "Accepted" ? "Expired" : q.status}
                    </span>
                  </td>
                  <td>{q.quoteDate ? q.quoteDate.toLocaleDateString("en-NZ") : "—"}</td>
                  <td>{q.expiryDate ? q.expiryDate.toLocaleDateString("en-NZ") : "—"}</td>
                  <td>
                    {q.status !== "Accepted" && !isExpired && (
                      <form action={acceptQuote.bind(null, q.id)}>
                        <button type="submit" className="btn light">
                          Accept
                        </button>
                      </form>
                    )}
                    {isExpired && q.status !== "Accepted" && <span className="hint">Cannot accept — expired</span>}
                  </td>
                </tr>
              );
            })}
            {quotes.length === 0 && (
              <tr>
                <td colSpan={8} className="hint">
                  No quotes imported yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
