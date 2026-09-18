"use client";

import { useActionState, useState } from "react";
import { createRemedialItem, type RemedialFormState } from "./actions";
import { JobPicker, type JobPickerOption } from "@/components/JobPicker";

const initialState: RemedialFormState = {};

export function RemedialForm({ jobs, staff }: { jobs: JobPickerOption[]; staff: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createRemedialItem, initialState);
  const [jobNumber, setJobNumber] = useState("");

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="label">Raise a Remedial</div>
      <form action={formAction} style={{ marginTop: 10 }}>
        <input type="hidden" name="jobNumber" value={jobNumber} />
        <div className="form">
          <div>
            <label>Job Number</label>
            <JobPicker jobs={jobs} value={jobNumber} onChange={setJobNumber} />
          </div>
          <div>
            <label htmlFor="priority">Priority</label>
            <select id="priority" name="priority" defaultValue="Normal">
              <option>Low</option>
              <option>Normal</option>
              <option>High</option>
              <option>Urgent</option>
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
            <label htmlFor="issue">Issue</label>
            <textarea id="issue" name="issue" rows={3} required placeholder="Describe what needs fixing..." />
          </div>
        </div>
        {state.error && <div className="authError">{state.error}</div>}
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? "Adding…" : "Raise Remedial"}
          </button>
        </div>
      </form>
    </div>
  );
}
