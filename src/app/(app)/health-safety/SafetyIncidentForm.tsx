"use client";

import { useActionState, useState } from "react";
import { createSafetyIncident, type SafetyIncidentFormState } from "./actions";
import { JobPicker, type JobPickerOption } from "@/components/JobPicker";

const initialState: SafetyIncidentFormState = {};

export function SafetyIncidentForm({ jobs }: { jobs: JobPickerOption[] }) {
  const [state, formAction, pending] = useActionState(createSafetyIncident, initialState);
  const [jobNumber, setJobNumber] = useState("");

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="label">Report Incident / Near Miss / Hazard</div>
      <form action={formAction} style={{ marginTop: 10 }}>
        <input type="hidden" name="jobNumber" value={jobNumber} />
        <div className="form">
          <div>
            <label htmlFor="type">Type</label>
            <select id="type" name="type" defaultValue="Incident">
              <option>Incident</option>
              <option>Near Miss</option>
              <option>Hazard</option>
            </select>
          </div>
          <div>
            <label htmlFor="severity">Severity</label>
            <select id="severity" name="severity" defaultValue="Low">
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>
          <div>
            <label>Job Number (optional)</label>
            <JobPicker jobs={jobs} value={jobNumber} onChange={setJobNumber} />
          </div>
          <div className="full">
            <label htmlFor="description">What happened</label>
            <textarea id="description" name="description" rows={3} required placeholder="Describe what happened..." />
          </div>
        </div>
        {state.error && <div className="authError">{state.error}</div>}
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? "Reporting…" : "Report"}
          </button>
        </div>
      </form>
    </div>
  );
}
