import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { RemedialForm } from "./RemedialForm";
import { resolveRemedialItem } from "./actions";

const PRIORITY_COLOR: Record<string, string> = {
  Low: "grey",
  Normal: "blue",
  High: "orange",
  Urgent: "red",
};

export default async function RemedialPage() {
  await requireUser();

  const [items, jobs, staff] = await Promise.all([
    prisma.remedialItem.findMany({
      where: { status: "Open" },
      include: { raisedBy: true, assignedTo: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.job.findMany({ where: { archived: false }, orderBy: { number: "asc" }, select: { number: true, title: true } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Remedial</h2>
          <div className="subtitle">{items.length} open remedial item(s) — shared, real-time for everyone signed in.</div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Job</th>
              <th>Issue</th>
              <th>Priority</th>
              <th>Raised By</th>
              <th>Assigned To</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.jobNumber}</td>
                <td style={{ whiteSpace: "pre-wrap" }}>{item.issue}</td>
                <td>
                  <span className={`status ${PRIORITY_COLOR[item.priority] ?? "grey"}`}>{item.priority}</span>
                </td>
                <td>{item.raisedBy?.name ?? "—"}</td>
                <td>{item.assignedTo?.name ?? "—"}</td>
                <td>{item.createdAt.toLocaleDateString("en-NZ")}</td>
                <td>
                  <form action={resolveRemedialItem.bind(null, item.id)}>
                    <button type="submit" className="btn light">
                      Resolve
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="hint">
                  No open remedial items.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <RemedialForm jobs={jobs} staff={staff} />
    </div>
  );
}
