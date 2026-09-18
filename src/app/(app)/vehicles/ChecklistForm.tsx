"use client";

import { useActionState } from "react";
import { createVehicleChecklist, type ChecklistFormState } from "./checklistActions";
import { DEFAULT_CHECKLIST_ITEMS } from "./checklistDefaults";

const initialState: ChecklistFormState = {};

export function ChecklistForm({
  vehicles,
  staff,
}: {
  vehicles: { id: string; name: string }[];
  staff: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createVehicleChecklist, initialState);

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="label">Assign a Vehicle Checklist</div>
      <div className="hint" style={{ marginTop: 4 }}>
        Emails the assigned person immediately; management gets an alert automatically if it's still not done after
        the due date.
      </div>
      <form action={formAction} style={{ marginTop: 10 }}>
        <div className="form">
          <div>
            <label htmlFor="vehicleId">Vehicle</label>
            <select id="vehicleId" name="vehicleId" required defaultValue="">
              <option value="" disabled>
                Select vehicle...
              </option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="assignedToId">Assign To</label>
            <select id="assignedToId" name="assignedToId" required defaultValue="">
              <option value="" disabled>
                Select person...
              </option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dueDate">Due Date</label>
            <input id="dueDate" name="dueDate" type="date" required />
          </div>
          <div className="full">
            <label htmlFor="items">Checklist Items (one per line)</label>
            <textarea id="items" name="items" rows={9} defaultValue={DEFAULT_CHECKLIST_ITEMS} />
          </div>
        </div>
        {state.error && <div className="authError">{state.error}</div>}
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? "Sending…" : "Send Checklist"}
          </button>
        </div>
      </form>
    </div>
  );
}
