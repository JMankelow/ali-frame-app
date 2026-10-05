"use client";

import { useActionState } from "react";
import { JOB_LEAD_SOURCES } from "@/lib/jobStatus";
import { createLead, type LeadFormState } from "./actions";

const initialState: LeadFormState = {};

export function LeadForm({ staff }: { staff: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createLead, initialState);

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="label">Add Lead</div>
      <form action={formAction} className="form" style={{ marginTop: 10 }}>
        <div>
          <label htmlFor="reference">Reference</label>
          <input id="reference" name="reference" placeholder="LEAD-2050" required />
        </div>
        <div>
          <label htmlFor="title">Title</label>
          <input id="title" name="title" required />
        </div>
        <div>
          <label htmlFor="source">Source</label>
          <select id="source" name="source" defaultValue="">
            <option value="">— Select source —</option>
            {JOB_LEAD_SOURCES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="assignedToId">Assign To</label>
          <select id="assignedToId" name="assignedToId" defaultValue="">
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="full">
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" />
        </div>
        {state.error && <div className="authError">{state.error}</div>}
        <div className="full actions">
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? "Adding…" : "Add Lead"}
          </button>
        </div>
      </form>
    </div>
  );
}
