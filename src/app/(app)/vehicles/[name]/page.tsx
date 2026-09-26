import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { VehicleCard } from "../VehicleCard";
import { ChecklistRow } from "../ChecklistRow";
import { CreateChecklistForm } from "../CreateChecklistForm";

export default async function VehicleDetailPage({ params }: { params: Promise<{ name: string }> }) {
  await requireUser();
  const { name } = await params;

  const [vehicle, staff] = await Promise.all([
    prisma.vehicle.findUnique({
      where: { name },
      include: { issues: { where: { status: "Open" }, include: { raisedBy: true }, orderBy: { createdAt: "desc" } } },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!vehicle) notFound();

  const [checklists, maintenanceRecords] = await Promise.all([
    prisma.vehicleChecklist.findMany({
      where: { vehicleId: vehicle.id },
      include: { assignedTo: true },
      orderBy: { dueDate: "desc" },
      take: 20,
    }),
    prisma.vehicleMaintenanceRecord.findMany({ where: { vehicleId: vehicle.id }, orderBy: { checklistDate: "desc" } }),
  ]);

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>{vehicle.name}</h2>
          <div className="subtitle">Assignment, warrants, mechanic bookings and issue reporting.</div>
        </div>
        <Link href="/vehicles" className="btn light">
          ← All Vehicles
        </Link>
      </div>

      <VehicleCard
        id={vehicle.id}
        name={vehicle.name}
        rego={vehicle.rego}
        assignedToUserId={vehicle.assignedToUserId}
        mechanicEmail={vehicle.mechanicEmail}
        wofDueDate={vehicle.wofDueDate ? vehicle.wofDueDate.toISOString() : null}
        regoDueDate={vehicle.regoDueDate ? vehicle.regoDueDate.toISOString() : null}
        serviceDueDate={vehicle.serviceDueDate ? vehicle.serviceDueDate.toISOString() : null}
        staff={staff}
        issues={vehicle.issues.map((i) => ({
          id: i.id,
          type: i.type,
          description: i.description,
          status: i.status,
          raisedByName: i.raisedBy?.name ?? "—",
          createdAt: i.createdAt.toISOString(),
        }))}
      />

      {vehicle.rucType && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="label">RUC (Road User Charges)</div>
          <div className="hint" style={{ marginTop: 4 }}>
            Seeded from a manual EROAD snapshot — not live yet (needs API access from Jo's EROAD account manager).
          </div>
          <div className="form" style={{ marginTop: 10 }}>
            <div>
              <label>Licence Type</label>
              <div>{vehicle.rucType}</div>
            </div>
            <div>
              <label>Odometer</label>
              <div>{vehicle.rucOdometerKm?.toLocaleString("en-NZ") ?? "—"} km</div>
            </div>
            <div>
              <label>RUC Range</label>
              <div>
                {vehicle.rucStartDistKm?.toLocaleString("en-NZ")} – {vehicle.rucEndDistKm?.toLocaleString("en-NZ")} km
              </div>
            </div>
            <div>
              <label>Remaining</label>
              <div style={{ color: (vehicle.rucRemainingKm ?? 9999) < 1000 ? "#dc2626" : undefined, fontWeight: 700 }}>
                {vehicle.rucRemainingKm?.toLocaleString("en-NZ") ?? "—"} km
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="label">Checklist History</div>
        {checklists.length === 0 ? (
          <div className="hint" style={{ marginTop: 8 }}>
            No checklists assigned yet for this vehicle.
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
                  vehicleName={vehicle.name}
                  assignedName={c.assignedTo.name}
                  items={c.items}
                  dueDate={c.dueDate.toISOString()}
                  status={c.status}
                />
              ))}
            </tbody>
          </table>
        )}
        <div style={{ marginTop: 10 }}>
          <CreateChecklistForm vehicleId={vehicle.id} assignedToId={vehicle.assignedToUserId} staff={staff} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="label">Maintenance History</div>
        {maintenanceRecords.length === 0 ? (
          <div className="hint" style={{ marginTop: 8 }}>
            No maintenance history imported for this vehicle.
          </div>
        ) : (
          <table style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Completed By</th>
                <th>WOF</th>
                <th>KMs</th>
                <th>Comments</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {maintenanceRecords.map((r) => (
                <tr key={r.id}>
                  <td>{r.checklistDate ? r.checklistDate.toLocaleDateString("en-NZ") : "—"}</td>
                  <td>{r.completedBy ?? "—"}</td>
                  <td>{r.wofDate ?? "—"}</td>
                  <td>{r.kms ?? "—"}</td>
                  <td>{r.comments ?? "—"}</td>
                  <td>{r.actions ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
