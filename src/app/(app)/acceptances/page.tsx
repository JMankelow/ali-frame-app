import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AcceptanceForm } from "./AcceptanceForm";
import { markDepositPaid } from "./actions";

const money = (v: number | null) => (v == null ? "" : v.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }));

export default async function AcceptancesPage() {
  await requireUser();

  const [acceptances, jobs] = await Promise.all([
    prisma.acceptance.findMany({ include: { createdBy: true }, orderBy: { signedAt: "desc" } }),
    prisma.job.findMany({ where: { archived: false }, orderBy: { number: "asc" }, select: { number: true, title: true } }),
  ]);
  const waiting = acceptances.filter((a) => !a.depositPaidAt).length;

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Acceptances</h2>
          <div className="subtitle">
            {acceptances.length} recorded acceptance(s){waiting ? ` — ${waiting} waiting on the deposit` : ""}. Tanya is told to book the check measure once a job is accepted and paid.
          </div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Job</th>
              <th>Accepted By</th>
              <th>Date</th>
              <th>Deposit</th>
              <th>Check measure</th>
              <th>Notes</th>
              <th>Recorded By</th>
            </tr>
          </thead>
          <tbody>
            {acceptances.map((a) => (
              <tr key={a.id}>
                <td>{a.jobNumber}</td>
                <td>{a.acceptedBy}</td>
                <td>{a.signedAt.toLocaleDateString("en-NZ")}</td>
                <td>
                  {a.depositPaidAt ? (
                    <span className="status green">Paid {a.depositPaidAt.toLocaleDateString("en-NZ")} {money(a.depositAmount)}</span>
                  ) : (
                    <form action={markDepositPaid.bind(null, a.id)} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span className="status orange">Awaiting deposit</span>
                      <input name="depositAmount" type="number" step="0.01" min="0" placeholder="Amount" style={{ width: 100 }} />
                      <button type="submit" className="btn light">Deposit received</button>
                    </form>
                  )}
                </td>
                <td>{a.tanyaNotifiedAt ? <span className="status blue">Tanya told {a.tanyaNotifiedAt.toLocaleDateString("en-NZ")}</span> : <span className="hint">—</span>}</td>
                <td>{a.notes ?? "—"}</td>
                <td>{a.createdBy?.name ?? "—"}</td>
              </tr>
            ))}
            {acceptances.length === 0 && (
              <tr>
                <td colSpan={7} className="hint">
                  No acceptances recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AcceptanceForm jobs={jobs} />
    </div>
  );
}
