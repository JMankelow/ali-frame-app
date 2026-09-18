import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SafetyIncidentForm } from "./SafetyIncidentForm";
import { resolveSafetyIncident } from "./actions";

const SEVERITY_COLOR: Record<string, string> = { Low: "grey", Medium: "orange", High: "red" };

export default async function HealthSafetyPage() {
  await requireUser();

  const [items, jobs] = await Promise.all([
    prisma.safetyIncident.findMany({
      where: { status: "Open" },
      include: { reportedBy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.job.findMany({ where: { archived: false }, orderBy: { number: "asc" }, select: { number: true, title: true } }),
  ]);

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Health &amp; Safety</h2>
          <div className="subtitle">{items.length} open incident(s)/hazard(s) — anyone signed in can report one.</div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Severity</th>
              <th>Job</th>
              <th>Description</th>
              <th>Reported By</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.type}</td>
                <td>
                  <span className={`status ${SEVERITY_COLOR[item.severity] ?? "grey"}`}>{item.severity}</span>
                </td>
                <td>{item.jobNumber ?? "—"}</td>
                <td style={{ whiteSpace: "pre-wrap" }}>{item.description}</td>
                <td>{item.reportedBy.name}</td>
                <td>{item.createdAt.toLocaleDateString("en-NZ")}</td>
                <td>
                  <form action={resolveSafetyIncident.bind(null, item.id)} className="actions">
                    <input name="actionTaken" placeholder="Action taken (optional)" style={{ width: 160 }} />
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
                  No open incidents, near misses or hazards.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <SafetyIncidentForm jobs={jobs} />
    </div>
  );
}
