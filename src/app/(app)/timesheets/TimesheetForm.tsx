"use client";

import { useActionState, useState } from "react";
import { createTimesheetEntry, type TimesheetFormState } from "./actions";
import { JobPicker, type JobPickerOption } from "@/components/JobPicker";

const WORK_TYPES = ["Install", "Check Measure", "Measure Up", "Remedial", "QA / Completion", "Travel / Pickup", "Other"];

const initialState: TimesheetFormState = {};

export function TimesheetForm({ jobs, staff, currentUserId }: { jobs: JobPickerOption[]; staff: { id: string; name: string }[]; currentUserId: string }) {
  const [state, formAction, pending] = useActionState(createTimesheetEntry, initialState);
  const [jobNumber, setJobNumber] = useState("");

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="label">Add Timesheet Entry</div>
      <form action={formAction} style={{ marginTop: 10 }}>
        <input type="hidden" name="jobNumber" value={jobNumber} />
        <div className="form">
          <div>
            <label htmlFor="staffUserId">Staff Member</label>
            <select id="staffUserId" name="staffUserId" defaultValue={currentUserId}>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Job Number</label>
            <JobPicker jobs={jobs} value={jobNumber} onChange={setJobNumber} />
          </div>
          <div>
            <label htmlFor="dateWorked">Date Worked</label>
            <input id="dateWorked" name="dateWorked" type="date" required />
          </div>
          <div>
            <label htmlFor="workType">Work Type</label>
            <select id="workType" name="workType" defaultValue="Install">
              {WORK_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="startTime">Start Time</label>
            <input id="startTime" name="startTime" type="time" required />
          </div>
          <div>
            <label htmlFor="finishTime">Finish Time</label>
            <input id="finishTime" name="finishTime" type="time" required />
          </div>
          <div>
            <label htmlFor="breakMinutes">Break Minutes</label>
            <input id="breakMinutes" name="breakMinutes" type="number" defaultValue={30} min={0} />
          </div>
          <div className="full">
            <label htmlFor="notes">Work Completed / Notes</label>
            <textarea id="notes" name="notes" rows={2} />
          </div>
        </div>
        {state.error && <div className="authError">{state.error}</div>}
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? "Submitting…" : "Submit Timesheet"}
          </button>
        </div>
      </form>
    </div>
  );
}
