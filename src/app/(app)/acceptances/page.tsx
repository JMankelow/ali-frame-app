import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AcceptanceForm } from "./AcceptanceForm";

export default async function AcceptancesPage() {
  await requireUser();

  const [acceptances, jobs] = await Promise.all([
    prisma.acceptance.findMany({ include: { createdBy: true }, orderBy: { signedAt: "desc" } }),
    prisma.job.findMany({ where: { archived: false }, orderBy: { number: "asc" }, select: { number: true, title: true } }),
  ]);

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Acceptances</h2>
          <div className="subtitle">{acceptances.length} recorded acceptance(s) — shared, real-time for everyone signed in.</div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Job</th>
              <th>Accepted By</th>
              <th>Date</th>
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
                <td>{a.notes ?? "—"}</td>
                <td>{a.createdBy?.name ?? "—"}</td>
              </tr>
            ))}
            {acceptances.length === 0 && (
              <tr>
                <td colSpan={5} className="hint">
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
