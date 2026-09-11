"use client";

import { useActionState } from "react";
import { createJob, type JobFormState } from "./actions";

const initialState: JobFormState = {};

export function JobForm() {
  const [state, formAction, pending] = useActionState(createJob, initialState);

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="label">Add Job</div>
      <form action={formAction} className="form" style={{ marginTop: 10 }}>
        <div>
          <label htmlFor="number">Job Number</label>
          <input id="number" name="number" placeholder="JOB-12345" required />
        </div>
        <div>
          <label htmlFor="title">Title</label>
          <input id="title" name="title" required />
        </div>
        <div className="full">
          <label htmlFor="address">Address</label>
          <input id="address" name="address" />
        </div>
        <div>
          <label htmlFor="type">Job Type</label>
          <select id="type" name="type" defaultValue="RESIDENTIAL">
            <option value="RESIDENTIAL">Residential</option>
            <option value="COMMERCIAL">Commercial</option>
          </select>
        </div>
        <div>
          <label htmlFor="status">Status</label>
          <input id="status" name="status" defaultValue="New" />
        </div>
        <div>
          <label htmlFor="supplier">Supplier</label>
          <input id="supplier" name="supplier" />
        </div>
        {state.error && <div className="authError">{state.error}</div>}
        <div className="full actions">
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? "Adding…" : "Add Job"}
          </button>
        </div>
      </form>
    </div>
  );
}
