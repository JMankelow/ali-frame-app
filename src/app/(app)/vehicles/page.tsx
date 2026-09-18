import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { VehicleCard } from "./VehicleCard";
import { ChecklistForm } from "./ChecklistForm";
import { ChecklistRow } from "./ChecklistRow";

export default async function VehiclesPage() {
  await requireUser();

  const [vehicles, staff, checklists] = await Promise.all([
    prisma.vehicle.findMany({
      orderBy: { name: "asc" },
      include: { issues: { where: { status: "Open" }, include: { raisedBy: true }, orderBy: { createdAt: "desc" } } },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.vehicleChecklist.findMany({
      include: { vehicle: true, assignedTo: true },
      orderBy: { dueDate: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Vehicles</h2>
          <div className="subtitle">{vehicles.length} vehicle(s) — assignment, warrants, mechanic bookings and issue reporting.</div>
        </div>
      </div>

      {vehicles.map((v) => (
        <VehicleCard
          key={v.id}
          id={v.id}
          name={v.name}
          rego={v.rego}
          assignedToUserId={v.assignedToUserId}
          mechanicEmail={v.mechanicEmail}
          wofDueDate={v.wofDueDate ? v.wofDueDate.toISOString() : null}
          regoDueDate={v.regoDueDate ? v.regoDueDate.toISOString() : null}
          serviceDueDate={v.serviceDueDate ? v.serviceDueDate.toISOString() : null}
          staff={staff}
          issues={v.issues.map((i) => ({
            id: i.id,
            type: i.type,
            description: i.description,
            status: i.status,
            raisedByName: i.raisedBy?.name ?? "—",
            createdAt: i.createdAt.toISOString(),
          }))}
        />
      ))}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="label">Vehicle Checklists</div>
        {checklists.length === 0 ? (
          <div className="hint" style={{ marginTop: 8 }}>
            No checklists assigned yet.
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
