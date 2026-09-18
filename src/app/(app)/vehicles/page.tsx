import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ChecklistForm } from "./ChecklistForm";
import { ChecklistRow } from "./ChecklistRow";

function toDateInput(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export default async function VehiclesPage() {
  await requireUser();

  const [vehicles, staff, checklists] = await Promise.all([
    prisma.vehicle.findMany({
      orderBy: { name: "asc" },
      include: {
        assignedToUser: true,
        issues: { where: { status: "Open" }, include: { raisedBy: true }, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.vehicleChecklist.findMany({
      where: { status: { not: "Completed" } },
      include: { vehicle: true, assignedTo: true },
      orderBy: { dueDate: "asc" },
      take: 50,
    }),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const overdue = (d: string) => !!d && d < today;
  const openIssues = vehicles.flatMap((v) => v.issues.map((i) => ({ ...i, vehicleName: v.name })));

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Vehicles</h2>
          <div className="subtitle">{vehicles.length} vehicle(s) — click one for assignment, warrants, mechanic bookings and issue reporting.</div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Assigned Driver</th>
              <th>WOF Due</th>
              <th>Rego Due</th>
              <th>Service Due</th>
              <th>Open Issues</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => {
              const wof = toDateInput(v.wofDueDate);
              const rego = toDateInput(v.regoDueDate);
              const service = toDateInput(v.serviceDueDate);
              return (
                <tr key={v.id}>
                  <td>
                    <Link href={`/vehicles/${encodeURIComponent(v.name)}`} style={{ color: "var(--blueDark)", fontWeight: 800, textDecoration: "none" }}>
                      {v.name}
                    </Link>
                  </td>
                  <td>{v.assignedToUser?.name ?? "— Unassigned —"}</td>
                  <td style={{ color: overdue(wof) ? "#dc2626" : undefined }}>{wof || "—"}</td>
                  <td style={{ color: overdue(rego) ? "#dc2626" : undefined }}>{rego || "—"}</td>
                  <td style={{ color: overdue(service) ? "#dc2626" : undefined }}>{service || "—"}</td>
                  <td>{v.issues.length > 0 ? <span className="status orange">{v.issues.length}</span> : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="label">To Do — Open Issues / Service Requests</div>
        {openIssues.length === 0 ? (
          <div className="hint" style={{ marginTop: 8 }}>
            Nothing outstanding across the fleet.
          </div>
        ) : (
          <table style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Type</th>
                <th>Description</th>
                <th>Raised By</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {openIssues.map((i) => (
                <tr key={i.id}>
                  <td>
                    <Link href={`/vehicles/${encodeURIComponent(i.vehicleName)}`} style={{ color: "var(--blueDark)", fontWeight: 800, textDecoration: "none" }}>
                      {i.vehicleName}
                    </Link>
                  </td>
                  <td>
                    <span className={`status ${i.type === "Service Request" ? "blue" : "orange"}`}>{i.type}</span>
                  </td>
                  <td>{i.description}</td>
                  <td>{i.raisedBy?.name ?? "—"}</td>
                  <td>
                    <Link href={`/vehicles/${encodeURIComponent(i.vehicleName)}`} className="btn light">
                      Open Vehicle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="label">To Do — Vehicle Checklists</div>
        {checklists.length === 0 ? (
          <div className="hint" style={{ marginTop: 8 }}>
            No checklists pending.
          </div>
        ) : (
          <table style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Assigned To</th>
                <th>Due</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {checklists.map((c) => (
                <ChecklistRow
                  key={c.id}
                  id={c.id}
                  vehicleName={c.vehicle.name}
                  assignedName={c.assignedTo.name}
                  items={c.items}
                  dueDate={c.dueDate.toISOString()}
                  status={c.status}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ChecklistForm vehicles={vehicles.map((v) => ({ id: v.id, name: v.name }))} staff={staff} />
    </div>
  );
}
