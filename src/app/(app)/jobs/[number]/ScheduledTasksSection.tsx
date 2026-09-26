"use client";

import { useActionState, useState } from "react";
import { createScheduledTask, updateScheduledTask, type ScheduledTaskState } from "../actions";
import { JOB_BOOKING_STATUSES } from "@/lib/jobStatus";

const TASK_TYPES = ["Sales Measure", "Check Measure", "Installation", "Remedial"];

const BOOKING_STATUS_COLOR: Record<string, string> = {
  Floating: "grey",
  "Booked in": "blue",
  "Booking Confirmed": "green",
  "Tentative Sales Booking Awaiting": "grey",
  "Check Measure Booked": "green",
  "Sales Rep Booked - Dwayne": "blue",
  "Sales Rep Booked - Kere": "blue",
  "Sales Rep Booked - Tristam": "blue",
  "Sales Follow Up on Quote Sent": "orange",
  "Commercial Meeting": "purple",
  "On Measures / Meetings": "purple",
  "On tools": "green",
  "Supply only": "orange",
  Remedial: "orange",
  "90% invoiced": "purple",
  "Fully Invoiced": "green",
};

export interface ScheduledTaskRow {
  id: string;
  type: string;
  scheduledDate: string;
  endDate: string | null;
  status: string;
  notes: string | null;
  assigneeIds: string[];
  assigneeNames: string[];
}

const initialState: ScheduledTaskState = {};

export function ScheduledTasksSection({
  jobNumber,
  tasks,
  staff,
}: {
  jobNumber: string;
  tasks: ScheduledTaskRow[];
  staff: { id: string; name: string }[];
}) {
  return (
    <div className="card">
      <div className="label">Scheduled Bookings</div>
      <div className="hint" style={{ marginTop: 4 }}>
        Check Measure, Installation, Remedial and Sales Measure bookings — each shows on the Calendar, can have more
        than one person allocated, and its status can be changed as the booking moves along.
      </div>

      {tasks.length > 0 && (
        <table style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Type</th>
              <th>From</th>
              <th>To</th>
              <th>Allocated</th>
              <th>Status</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} staff={staff} />
            ))}
          </tbody>
        </table>
      )}

      <NewTaskForm jobNumber={jobNumber} staff={staff} />
    </div>
  );
}

function TaskRow({ task, staff }: { task: ScheduledTaskRow; staff: { id: string; name: string }[] }) {
  const [editing, setEditing] = useState(false);
  const action = updateScheduledTask.bind(null, task.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (!editing) {
    return (
      <tr>
        <td>{task.type}</td>
        <td>{new Date(task.scheduledDate).toLocaleDateString("en-NZ")}</td>
        <td>{task.endDate ? new Date(task.endDate).toLocaleDateString("en-NZ") : "—"}</td>
        <td>{task.assigneeNames.join(", ") || "—"}</td>
        <td>
          <span className={`status ${BOOKING_STATUS_COLOR[task.status] ?? "grey"}`}>{task.status}</span>
        </td>
        <td>{task.notes ?? "—"}</td>
        <td>
          <button type="button" className="btn light" onClick={() => setEditing(true)}>
            Edit
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={7}>
        <form action={formAction} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-start", padding: "8px 0" }}>
          <select name="type" defaultValue={task.type}>
            {TASK_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <input type="date" name="scheduledDate" defaultValue={task.scheduledDate.slice(0, 10)} required />
          <input type="date" name="endDate" defaultValue={task.endDate ? task.endDate.slice(0, 10) : ""} placeholder="To (optional)" />
          <select name="status" defaultValue={task.status}>
            {!JOB_BOOKING_STATUSES.includes(task.status) && <option value={task.status}>{task.status}</option>}
            {JOB_BOOKING_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <input name="notes" defaultValue={task.notes ?? ""} placeholder="Notes" style={{ minWidth: 160 }} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {staff.map((s) => (
              <label key={s.id} style={{ fontWeight: 400, display: "flex", alignItems: "center", gap: 4 }}>
                <input type="checkbox" name="assigneeIds" value={s.id} defaultChecked={task.assigneeIds.includes(s.id)} />
                {s.name}
              </label>
            ))}
          </div>
          {state.error && <div className="authError">{state.error}</div>}
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </button>
          <button type="button" className="btn light" onClick={() => setEditing(false)}>
            Done
          </button>
        </form>
      </td>
    </tr>
  );
}

function NewTaskForm({ jobNumber, staff }: { jobNumber: string; staff: { id: string; name: string }[] }) {
  const action = createScheduledTask.bind(null, jobNumber);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} style={{ marginTop: 16, borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
      <div className="form">
        <div>
          <label>Booking Type</label>
          <select name="type" required defaultValue="">
            <option value="" disabled>
              — Select —
            </option>
            {TASK_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label>From Date</label>
          <input type="date" name="scheduledDate" required />
        </div>
        <div>
          <label>To Date (optional — for multi-day bookings)</label>
          <input type="date" name="endDate" />
        </div>
        <div>
          <label>Status</label>
          <select name="status" defaultValue="Floating">
            {JOB_BOOKING_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="full">
          <label>Allocate Team</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {staff.map((s) => (
              <label key={s.id} style={{ fontWeight: 400, display: "flex", alignItems: "center", gap: 4 }}>
                <input type="checkbox" name="assigneeIds" value={s.id} />
                {s.name}
              </label>
            ))}
          </div>
        </div>
        <div className="full">
          <label>Notes</label>
          <input name="notes" />
        </div>
      </div>
      {state.error && <div className="authError">{state.error}</div>}
      <div className="actions" style={{ marginTop: 12 }}>
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? "Booking…" : "Add Booking"}
        </button>
      </div>
    </form>
  );
}
