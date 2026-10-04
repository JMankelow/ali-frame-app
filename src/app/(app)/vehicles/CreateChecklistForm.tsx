"use client";

import { useActionState, useState } from "react";
import { createVehicleChecklist, type ChecklistFormState } from "./checklistActions";

const initialState: ChecklistFormState = {};

export function CreateChecklistForm({
  vehicleId,
  assignedToId,
  staff,
}: {
  vehicleId: string;
  assignedToId: string | null;
  staff: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createVehicleChecklist, initialState);

  if (!open) {
    return (
      <button type="button" className="btn light" onClick={() => setOpen(true)}>
        + Create Vehicle Checklist
      </button>
    );
  }

  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return (
    <form action={formAction} style={{ marginTop: 10 }}>
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <div className="form">
        <div>
          <label>Assigned To</label>
          <select name="assignedToId" defaultValue={assignedToId ?? ""} required>
            <option value="" disabled>
              — Select —
            </option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Due Date</label>
          <input type="date" name="dueDate" defaultValue={dueDate} required />
        </div>
        <div className="full hint">The driver gets the standard Yes/No vehicle check (interior, exterior, sign-off) by email and signs it with their own name.</div>
      </div>
      {state.error && <div className="authError">{state.error}</div>}
      <div className="actions" style={{ marginTop: 10 }}>
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? "Sending…" : "Send Checklist"}
        </button>
        <button type="button" className="btn light" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
