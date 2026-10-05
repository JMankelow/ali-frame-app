"use client";

import { useActionState, useState } from "react";
import { createAcceptance, type AcceptanceFormState } from "./actions";
import { JobPicker, type JobPickerOption } from "@/components/JobPicker";

const initialState: AcceptanceFormState = {};

export function AcceptanceForm({ jobs }: { jobs: JobPickerOption[] }) {
  const [state, formAction, pending] = useActionState(createAcceptance, initialState);
  const [jobNumber, setJobNumber] = useState("");
  const [paid, setPaid] = useState(false);

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="label">Record an Acceptance</div>
      <div className="hint" style={{ marginTop: 4 }}>
        Tanya is told to book the check measure as soon as a job is accepted <strong>and</strong> the deposit has been paid.
      </div>
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
          <div>
            <label style={{ fontWeight: 400, display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" name="depositPaid" checked={paid} onChange={(e) => setPaid(e.target.checked)} /> Deposit / payment has been received
            </label>
          </div>
          {paid && (
            <div>
              <label htmlFor="depositAmount">Amount received (optional)</label>
              <input id="depositAmount" name="depositAmount" type="number" step="0.01" min="0" />
            </div>
          )}
          <div className="full">
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" name="notes" rows={2} />
          </div>
        </div>
        {state.error && <div className="authError">{state.error}</div>}
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? "Recording…" : paid ? "Record & tell Tanya" : "Record Acceptance"}
          </button>
        </div>
      </form>
    </div>
  );
}
