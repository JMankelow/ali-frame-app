"use client";

import { useActionState } from "react";
import { createJob, type JobFormState } from "./actions";
import { JOB_STATUS_OPTIONS, JOB_LEAD_SOURCES } from "@/lib/jobStatus";

const initialState: JobFormState = {};

export function JobForm({ nextNumber, suppliers }: { nextNumber: string; suppliers: string[] }) {
  const [state, formAction, pending] = useActionState(createJob, initialState);

  return (
    <div id="add-job" className="card" style={{ marginTop: 16, scrollMarginTop: 110 }}>
      <div className="label">Add Job</div>
      <form action={formAction} className="form" style={{ marginTop: 10 }}>
        <div>
          <label htmlFor="number">Job Number</label>
          <input id="number" name="number" defaultValue={nextNumber} required />
          <div className="hint">Filled in with the next free number — change it only if you need to.</div>
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
          <select id="status" name="status" defaultValue="New">
            {JOB_STATUS_OPTIONS.map((st) => (
              <option key={st}>{st}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="supplier">Supplier</label>
          <select id="supplier" name="supplier" defaultValue="">
            <option value="">— Select supplier —</option>
            {suppliers.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="leadSource">Lead / How Did They Hear About Us?</label>
          <select id="leadSource" name="leadSource" defaultValue="">
            <option value="">— Select lead —</option>
            {JOB_LEAD_SOURCES.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
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
