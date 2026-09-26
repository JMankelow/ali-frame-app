"use client";

import { useActionState, useState } from "react";
import { createStaffLeave, type LeaveFormState } from "./actions";

const LEAVE_TYPES = ["Annual Leave", "Sick Leave", "Public Holiday", "Bereavement Leave"];
const initialState: LeaveFormState = {};

export function AddLeaveForm({ staff }: { staff: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createStaffLeave, initialState);

  if (!open) {
    return (
      <button type="button" className="btn light" onClick={() => setOpen(true)}>
        + Add Leave
      </button>
    );
  }

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="label">Add Leave</div>
      <form action={formAction} style={{ marginTop: 10 }}>
        <div className="form">
          <div>
            <label>Type</label>
            <select name="type" defaultValue={LEAVE_TYPES[0]}>
              {LEAVE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label>From Date</label>
            <input type="date" name="fromDate" required />
          </div>
          <div>
            <label>To Date (optional)</label>
            <input type="date" name="toDate" />
          </div>
          <div className="full">
            <label>Who</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {staff.map((s) => (
                <label key={s.id} style={{ fontWeight: 400, display: "flex", alignItems: "center", gap: 4 }}>
                  <input type="checkbox" name="staffIds" value={s.id} />
                  {s.name}
                </label>
              ))}
            </div>
          </div>
          <div className="full">
            <label>Notes</label>
            <input name="notes" />
          </div>
        </div>
        {state.error && <div className="authError">{state.error}</div>}
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? "Saving…" : "Save Leave"}
          </button>
          <button type="button" className="btn light" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
