"use client";

import { useActionState, useState } from "react";
import { createAcceptance, type AcceptanceFormState } from "./actions";
import { JobPicker, type JobPickerOption } from "@/components/JobPicker";

const initialState: AcceptanceFormState = {};

export function AcceptanceForm({ jobs }: { jobs: JobPickerOption[] }) {
  const [state, formAction, pending] = useActionState(createAcceptance, initialState);
  const [jobNumber, setJobNumber] = useState("");

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="label">Record an Acceptance</div>
      <form action={formAction} style={{ marginTop: 10 }}>
        <input type="hidden" name="jobNumber" value={jobNumber} />
        <div className="form">
          <div>
            <label>Job Number</label>
            <JobPicker jobs={jobs} value={jobNumber} onChange={setJobNumber} />
          </div>
          <div>
            <label htmlFor="acceptedBy">Accepted By</label>
            <input id="acceptedBy" name="acceptedBy" placeholder="Customer name" required />
          </div>
          <div className="full">
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" name="notes" rows={2} />
          </div>
        </div>
        {state.error && <div className="authError">{state.error}</div>}
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? "Recording…" : "Record Acceptance"}
          </button>
        </div>
      </form>
    </div>
  );
}
