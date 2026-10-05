// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useActionState, useState } from "react";
import { JobPicker } from "@/components/JobPicker";
import { bookAppointment, type BookAppointmentState } from "./actions";

const initial: BookAppointmentState = {};

interface JobOption {
  number: string;
  title: string;
  email: string | null;
  address: string | null;
}

export function BookAppointmentForm({ jobs, staff }: { jobs: JobOption[]; staff: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(bookAppointment, initial);
  const [jobNumber, setJobNumber] = useState("");
  const [endTime, setEndTime] = useState("");
  const job = jobs.find((j) => j.number === jobNumber);
  const plusHour = (t: string) => (t ? `${String(Math.min(Number(t.slice(0, 2)) + 1, 23)).padStart(2, "0")}:${t.slice(3, 5)}` : "");

  return (
    <div className="card">
      <div className="label">Book appointment</div>
      <div className="hint" style={{ marginTop: 4 }}>
        Pick the job — the client, address and email come from it. This puts the appointment on the Calendar and emails the client to confirm it&apos;s booked.
      </div>
      <form action={formAction} style={{ marginTop: 10 }}>
        <input type="hidden" name="jobNumber" value={jobNumber} />
        <div className="form">
          <div className="full">
            <label>Job</label>
            <JobPicker jobs={jobs} value={jobNumber} onChange={setJobNumber} />
            {job && (
              <div className="hint" style={{ marginTop: 4 }}>
                {job.address ?? "No address on the job"} · {job.email ?? "no client email on the job"}
              </div>
            )}
          </div>
          <div>
            <label>Appointment</label>
            <select name="type" defaultValue="Sales Measure">
              <option>Sales Measure</option>
              <option>Check Measure</option>
            </select>
          </div>
          <div>
            <label>Date</label>
            <input type="date" name="date" required />
          </div>
          <div>
            <label>Start time</label>
            <input type="time" name="startTime" required onChange={(e) => setEndTime(plusHour(e.target.value))} />
          </div>
          <div>
            <label>End time (defaults to 1 hour)</label>
            <input type="time" name="endTime" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
          <div className="full">
            <label>Who is going</label>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 4 }}>
              {staff.map((s) => (
                <label key={s.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="checkbox" name="assigneeIds" value={s.id} /> {s.name}
                </label>
              ))}
            </div>
          </div>
          <div className="full">
            <label>Notes (optional)</label>
            <input name="notes" />
          </div>
          <div className="full">
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" name="emailClient" defaultChecked /> Email the client to confirm the booking
            </label>
          </div>
        </div>
        {state.error && <div className="authError" style={{ marginTop: 10 }}>{state.error}</div>}
        {state.success && <div className="status green" style={{ marginTop: 10, display: "inline-block" }}>{state.success}</div>}
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="submit" className="btn primary" disabled={pending}>{pending ? "Booking…" : "Book & email client"}</button>
        </div>
      </form>
    </div>
  );
}
