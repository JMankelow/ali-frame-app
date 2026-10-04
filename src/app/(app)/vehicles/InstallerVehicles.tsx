// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { prisma } from "@/lib/prisma";
import { ChecklistRow } from "./ChecklistRow";
import { VehicleIssueForm } from "./VehicleIssueForm";

const fmt = (d: Date | null) => (d ? d.toLocaleDateString("en-NZ") : "—");

/** What a field worker sees on /vehicles: only their own vehicle(s), their checklist, and issue reporting. */
export async function InstallerVehicles({ userId }: { userId: string }) {
  const vehicles = await prisma.vehicle.findMany({
    where: { assignedToUserId: userId },
    include: {
      issues: { where: { status: "Open" }, orderBy: { createdAt: "desc" } },
      checklists: { where: { assignedToId: userId }, orderBy: { dueDate: "desc" }, take: 6 },
    },
    orderBy: { name: "asc" },
  });
  const today = new Date();

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>My Vehicle</h2>
          <div className="subtitle">Your assigned vehicle, its monthly check, and reporting problems to the office.</div>
        </div>
      </div>

      {vehicles.length === 0 && <div className="card hint">No vehicle is assigned to you. Ask the office if you should have one.</div>}

      {vehicles.map((v) => {
        const pending = v.checklists.filter((c) => c.status !== "Completed");
        const due = (d: Date | null) => (d && d < today ? { color: "#dc2626", fontWeight: 700 } : undefined);
        return (
          <div key={v.id} className="card" style={{ marginTop: 16 }}>
            <div className="label">
              {v.name}
              {v.rego && v.rego !== v.name ? ` (${v.rego})` : ""}
            </div>
            <div className="form" style={{ marginTop: 10 }}>
              <div><label>WOF due</label><div style={due(v.wofDueDate)}>{fmt(v.wofDueDate)}</div></div>
              <div><label>Rego due</label><div style={due(v.regoDueDate)}>{fmt(v.regoDueDate)}</div></div>
              <div><label>Service due</label><div style={due(v.serviceDueDate)}>{fmt(v.serviceDueDate)}</div></div>
            </div>

            <div className="label" style={{ marginTop: 16 }}>Monthly vehicle check</div>
            {v.checklists.length === 0 ? (
              <div className="hint" style={{ marginTop: 6 }}>Nothing sent yet — it arrives by email on the 1st of each month.</div>
            ) : (
              <table style={{ marginTop: 6 }}>
                <thead><tr><th>Vehicle</th><th>Assigned To</th><th>Due</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {v.checklists.map((c) => (
                    <ChecklistRow key={c.id} id={c.id} vehicleName={v.name} assignedName="You" items={c.items} dueDate={c.dueDate.toISOString()} status={c.status} template={c.template} />
                  ))}
                </tbody>
              </table>
            )}
            {pending.length > 0 && <div className="hint" style={{ marginTop: 6 }}>You have {pending.length} check(s) to complete.</div>}

            <div className="label" style={{ marginTop: 16 }}>Open issues</div>
            {v.issues.length === 0 ? (
              <div className="hint" style={{ marginTop: 6 }}>None reported.</div>
            ) : (
              <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                {v.issues.map((i) => <li key={i.id}>{i.description}</li>)}
              </ul>
            )}
            <VehicleIssueForm vehicleId={v.id} />
          </div>
        );
      })}
    </div>
  );
}
