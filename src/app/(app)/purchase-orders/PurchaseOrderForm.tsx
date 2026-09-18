"use client";

import { useActionState, useState } from "react";
import { createPurchaseOrder, type PurchaseOrderFormState } from "./actions";
import { JobPicker, type JobPickerOption } from "@/components/JobPicker";

const SUPPLIERS = ["Vision", "Rylock", "NZW", "APL"];
const initialState: PurchaseOrderFormState = {};

export function PurchaseOrderForm({ jobs }: { jobs: JobPickerOption[] }) {
  const [state, formAction, pending] = useActionState(createPurchaseOrder, initialState);
  const [jobNumber, setJobNumber] = useState("");

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="label">Add Purchase Order</div>
      <form action={formAction} style={{ marginTop: 10 }}>
        <input type="hidden" name="jobNumber" value={jobNumber} />
        <div className="form">
          <div>
            <label htmlFor="poNumber">PO Number</label>
            <input id="poNumber" name="poNumber" placeholder="PO-1001" required />
          </div>
          <div>
            <label>Job Number</label>
            <JobPicker jobs={jobs} value={jobNumber} onChange={setJobNumber} />
          </div>
          <div>
            <label htmlFor="supplier">Supplier</label>
            <select id="supplier" name="supplier" defaultValue="">
              <option value="" disabled>
                Select supplier...
              </option>
              {SUPPLIERS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="amount">Amount ($, excl GST)</label>
            <input id="amount" name="amount" type="number" step="0.01" defaultValue="0" />
          </div>
          <div className="full">
            <label htmlFor="description">Description</label>
            <input id="description" name="description" placeholder="e.g. Aluminium joinery for Items 1-9" />
          </div>
        </div>
        {state.error && <div className="authError">{state.error}</div>}
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? "Adding…" : "Add Purchase Order"}
          </button>
        </div>
      </form>
    </div>
  );
}
