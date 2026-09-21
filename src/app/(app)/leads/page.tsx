import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { markLeadConverted, reassignLead } from "./actions";
import { LeadForm } from "./LeadForm";

const STATUS_COLOR: Record<string, string> = {
  New: "blue",
  Contacted: "orange",
  Converted: "green",
  Lost: "grey",
};

export default async function LeadsPage() {
  await requireUser();
  const [leads, staff] = await Promise.all([
    prisma.lead.findMany({ include: { assignedTo: true }, orderBy: { createdAt: "desc" } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Leads</h2>
          <div className="subtitle">{leads.length} lead(s) — shared, real-time for everyone signed in.</div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Title</th>
              <th>Source</th>
              <th>Status</th>
              <th>Assigned To</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td>{lead.reference}</td>
                <td>{lead.title}</td>
                <td>{lead.source ?? "—"}</td>
                <td>
                  <span className={`status ${STATUS_COLOR[lead.status] ?? "grey"}`}>{lead.status}</span>
                </td>
                <td>
                  <form action={reassignLead.bind(null, lead.id)} className="actions">
                    <select name="assignedToId" defaultValue={lead.assignedToId ?? ""}>
                      <option value="">Unassigned</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="btn light">
                      Save
                    </button>
                  </form>
                </td>
                <td>
                  {lead.status !== "Converted" && (
                    <form action={markLeadConverted.bind(null, lead.id)}>
                      <button type="submit" className="btn light">
                        Mark Converted
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} className="hint">
                  No leads yet — add the first one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <LeadForm staff={staff} />
    </div>
  );
}
