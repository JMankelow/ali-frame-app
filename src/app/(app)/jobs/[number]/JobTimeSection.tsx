// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useActionState } from "react";
import { createTimesheetEntry, type TimesheetFormState } from "../../timesheets/actions";

const WORK_TYPES = ["Install", "Check Measure", "Measure Up", "Remedial", "QA / Completion", "Travel / Pickup", "Other"];
const initial: TimesheetFormState = {};

export interface JobTimeRow {
  id: string;
  date: string;
  staffName: string;
  workType: string;
  hours: number;
  status: string;
}

/** Log time against this job and see time already logged on it. Entries also appear on the Timesheets page. */
export function JobTimeSection({ jobNumber, userId, rows, showStaff }: { jobNumber: string; userId: string; rows: JobTimeRow[]; showStaff: boolean }) {
  const [state, action, pending] = useActionState(createTimesheetEntry, initial);
  const total = rows.reduce((s, r) => s + r.hours, 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="card">
        <div className="label">Add time to job {jobNumber}</div>
        <form action={action} style={{ marginTop: 10 }}>
          <input type="hidden" name="jobNumber" value={jobNumber} />
          <input type="hidden" name="staffUserId" value={userId} />
          <div className="form">
            <div><label>Date worked</label><input type="date" name="dateWorked" defaultValue={today} required /></div>
            <div>
              <label>Work type</label>
              <select name="workType" defaultValue="Install">{WORK_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
            </div>
            <div><label>Start</label><input type="time" name="startTime" required /></div>
            <div><label>Finish</label><input type="time" name="finishTime" required /></div>
            <div><label>Break (minutes)</label><input type="number" name="breakMinutes" min={0} defaultValue={0} /></div>
            <div><label>Notes</label><input name="notes" /></div>
          </div>
          {state.error && <div className="authError">{state.error}</div>}
          <div className="actions" style={{ marginTop: 12 }}>
            <button type="submit" className="btn primary" disabled={pending}>{pending ? "Saving…" : "Add time"}</button>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="label">Time logged on this job — {total.toFixed(2)} h{showStaff ? " (all staff)" : " (yours)"}</div>
        <table style={{ marginTop: 8 }}>
          <thead><tr><th>Date</th>{showStaff && <th>Staff</th>}<th>Work type</th><th>Hours</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.date}</td>
                {showStaff && <td>{r.staffName}</td>}
                <td>{r.workType}</td>
                <td>{r.hours.toFixed(2)}</td>
                <td><span className={`status ${r.status === "Approved" ? "green" : "orange"}`}>{r.status}</span></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="hint">No time logged yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
