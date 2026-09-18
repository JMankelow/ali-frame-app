"use client";

import { useActionState } from "react";
import { createEstimate, type EstimateFormState } from "./actions";

const initialState: EstimateFormState = {};

export function EstimateForm() {
  const [state, formAction, pending] = useActionState(createEstimate, initialState);

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="label">Add Estimate</div>
      <form action={formAction} style={{ marginTop: 10 }}>
        <div className="form">
          <div>
            <label>Client Name</label>
            <input name="clientName" required />
          </div>
          <div>
            <label>Address</label>
            <input name="address" />
          </div>
          <div>
            <label>Category</label>
            <input name="category" placeholder="e.g. Bifold Doors" />
          </div>
          <div>
            <label>Joinery Type</label>
            <input name="joineryType" />
          </div>
          <div>
            <label>Width (mm)</label>
            <input name="widthMM" type="number" />
          </div>
          <div>
            <label>Height (mm)</label>
            <input name="heightMM" type="number" />
          </div>
          <div>
            <label>Cladding</label>
            <input name="cladding" />
          </div>
          <div>
            <label>Estimated Cost</label>
            <input name="estimatedCostText" placeholder="e.g. $8,400 + GST" />
          </div>
          <div>
            <label>Status</label>
            <select name="status" defaultValue="Quoted">
              <option>Quoted</option>
              <option>Awaiting Reply</option>
              <option>Accepted</option>
              <option>Declined</option>
            </select>
          </div>
          <div className="full">
            <label>Notes</label>
            <textarea name="notes" rows={2} />
          </div>
        </div>
        {state.error && <div className="authError">{state.error}</div>}
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? "Adding…" : "Add Estimate"}
          </button>
        </div>
      </form>
    </div>
  );
}
