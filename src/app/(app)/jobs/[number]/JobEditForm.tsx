"use client";

import { useActionState } from "react";
import { updateJobDetails, type JobEditState } from "../actions";

const STATUS_OPTIONS = [
  "New",
  "Accepted",
  "Awaiting Deposit",
  "Check Measure",
  "Joinery Ordered",
  "Install Date confirmed",
  "In Progress",
  "Complete",
  "Remedial / Awaiting Material",
];

const initialState: JobEditState = {};

export function JobEditForm({
  jobNumber,
  clientName,
  clientPhone,
  clientEmail,
  status,
  type,
  supplier,
  address,
  assignedUserId,
  startDate,
  staff,
  onDone,
}: {
  jobNumber: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  status: string;
  type: "RESIDENTIAL" | "COMMERCIAL";
  supplier: string;
  address: string;
  assignedUserId: string;
  startDate: string;
  staff: { id: string; name: string }[];
  onDone: () => void;
}) {
  const action = updateJobDetails.bind(null, jobNumber);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction}>
      <div className="form">
        <div>
          <label>Customer Name</label>
          <input name="clientName" defaultValue={clientName} required />
        </div>
        <div>
          <label>Customer Phone</label>
          <input name="clientPhone" defaultValue={clientPhone} required />
        </div>
        <div>
          <label>Customer Email</label>
          <input name="clientEmail" type="email" defaultValue={clientEmail} required />
        </div>
        <div>
          <label>Status</label>
          <select name="status" defaultValue={status}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Type</label>
          <select name="type" defaultValue={type}>
            <option value="RESIDENTIAL">Residential</option>
            <option value="COMMERCIAL">Commercial</option>
          </select>
        </div>
        <div>
          <label>Supplier</label>
          <input name="supplier" defaultValue={supplier} />
        </div>
        <div className="full">
          <label>Address</label>
          <input name="address" defaultValue={address} />
        </div>
        <div>
          <label>Assigned To</label>
          <select name="assignedUserId" defaultValue={assignedUserId}>
            <option value="">— Unassigned —</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Start Date</label>
          <input name="startDate" type="date" defaultValue={startDate} />
        </div>
      </div>
      {state.error && <div className="authError">{state.error}</div>}
      <div className="actions" style={{ marginTop: 12 }}>
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? "Saving…" : "Save Changes"}
        </button>
        <button type="button" className="btn light" onClick={onDone}>
          Done
        </button>
      </div>
    </form>
  );
}
