"use client";

import { useActionState } from "react";
import { updateJobDetails, type JobEditState } from "../actions";
import { JOB_STATUS_OPTIONS, JOB_PRICE_TYPES, JOB_LEAD_SOURCES } from "@/lib/jobStatus";

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
  priceType,
  leadSource,
  staff,
  suppliers,
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
  priceType: string;
  leadSource: string;
  staff: { id: string; name: string }[];
  suppliers: { id: string; companyName: string }[];
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
            {!JOB_STATUS_OPTIONS.includes(status) && status && <option value={status}>{status}</option>}
            {JOB_STATUS_OPTIONS.map((s) => (
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
          <label>Price Type</label>
          <select name="priceType" defaultValue={priceType}>
            <option value="">— Select price type —</option>
            {JOB_PRICE_TYPES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label>How Did They Hear About Us?</label>
          <select name="leadSource" defaultValue={leadSource}>
            <option value="">— Select source —</option>
            {JOB_LEAD_SOURCES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Supplier</label>
          <select name="supplier" defaultValue={supplier}>
            <option value="">— Select supplier —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.companyName}>
                {s.companyName}
              </option>
            ))}
            {supplier && !suppliers.some((s) => s.companyName === supplier) && <option value={supplier}>{supplier}</option>}
          </select>
        </div>
        <div className="full">
          <label>Address</label>
          <input name="address" defaultValue={address} />
        </div>
        <div>
          <label>Assigned To (Sales)</label>
          <select name="assignedUserId" defaultValue={assignedUserId}>
            <option value="">— Unassigned —</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
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
