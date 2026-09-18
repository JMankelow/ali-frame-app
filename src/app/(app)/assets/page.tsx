import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AssetForm } from "./AssetForm";
import { retireAsset } from "./actions";
import { ChecklistForm } from "./ChecklistForm";
import { ChecklistRow } from "./ChecklistRow";

export default async function AssetsPage() {
  await requireUser();

  const [assets, staff, vehicles, checklists] = await Promise.all([
    prisma.asset.findMany({
      where: { status: "Active" },
      include: { assignedToUser: true, assignedToVehicle: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.vehicle.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
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
          <h2>Assets</h2>
          <div className="subtitle">{assets.length} active asset(s) — each assigned to a person or a vehicle.</div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Asset</th>
              <th>Description</th>
              <th>Assigned To</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.description ?? "—"}</td>
                <td>
                  {a.assignedToUser?.name ?? a.assignedToVehicle?.name ?? <span className="hint">Unassigned</span>}
                </td>
                <td>
                  <form action={retireAsset.bind(null, a.id)}>
                    <button type="submit" className="btn light">
                      Retire
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {assets.length === 0 && (
              <tr>
                <td colSpan={4} className="hint">
                  No assets yet — add one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AssetForm staff={staff} vehicles={vehicles} />

      {vehicles.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="label">Vehicles ({vehicles.length})</div>
          <div className="hint" style={{ marginTop: 8 }}>
            {vehicles.map((v) => v.name).join(", ")}
          </div>
        </div>
      )}

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

      <ChecklistForm vehicles={vehicles} staff={staff} />
    </div>
  );
}
