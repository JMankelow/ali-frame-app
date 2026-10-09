// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { JobPicker, type JobPickerOption } from "@/components/JobPicker";
import { TeamPicker } from "@/components/TeamPicker";
import { createScheduledTask, type ScheduledTaskState } from "../jobs/actions";
import { installEndDate } from "@/lib/installDates";

const TYPES = ["Sales Measure", "Check Measure", "Installation", "Remedial"];
const EVENT = "cal-add-booking";
const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (mins: number) => `${pad(Math.floor(mins / 60) % 24)}:${pad(mins % 60)}`;

/** Invisible click layer over one day's column: click a time slot to start a booking at that time. */
export function SlotLayer({ date, startHour, hourPx }: { date: string; startHour: number; hourPx: number }) {
  return (
    <div
      title="Click to add a booking"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const mins = Math.round(((e.clientY - r.top) / hourPx) * 4) * 15 + startHour * 60; // nearest quarter hour
        window.dispatchEvent(new CustomEvent(EVENT, { detail: { date, start: hhmm(mins), end: hhmm(mins + 60) } }));
      }}
      style={{ position: "absolute", inset: 0, cursor: "copy" }}
    />
  );
}

/** A "+" for a day cell (month view) — adds an all-day booking on that date. */
export function AddOnDay({ date }: { date: string }) {
  return (
    <button
      type="button"
      title="Add a booking"
      onClick={() => window.dispatchEvent(new CustomEvent(EVENT, { detail: { date } }))}
      style={{ float: "right", border: "none", background: "transparent", cursor: "pointer", color: "#0057b8", fontWeight: 700, fontSize: 15, lineHeight: 1, padding: "0 2px" }}
    >
      +
    </button>
  );
}

const initial: ScheduledTaskState = {};

/** The one "Add booking" pop-up for the whole calendar. */
export function AddBookingDialog({ jobs, staff }: { jobs: JobPickerOption[]; staff: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [job, setJob] = useState("");
  const [type, setType] = useState("Installation");
  const [date, setDate] = useState("");
  const [days, setDays] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [seed, setSeed] = useState(0);

  const [state, formAction, pending] = useActionState(async (prev: ScheduledTaskState, fd: FormData) => {
    const r = await createScheduledTask(String(fd.get("jobNumber") ?? ""), prev, fd);
    if (!r.error) {
      setOpen(false);
      router.refresh();
    }
    return r;
  }, initial);

  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent<{ date: string; start?: string; end?: string }>).detail;
      setDate(d.date);
      setStart(d.start ?? "");
      setEnd(d.end ?? "");
      setDays("");
      setJob("");
      setType(d.start ? "Sales Measure" : "Installation"); // a click on a time slot is usually a measure; a day is an install
      setSeed((s) => s + 1);
      setOpen(true);
    };
    window.addEventListener(EVENT, h);
    return () => window.removeEventListener(EVENT, h);
  }, []);

  if (!open) return null;
  const isMeasure = type === "Sales Measure" || type === "Check Measure";
  const n = parseFloat(days);
  const last = Number.isFinite(n) && n > 0 && date ? installEndDate(new Date(date + "T00:00:00Z"), n) : null;
  const fmt = (iso: Date) => iso.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 60, display: "grid", placeItems: "start center", padding: "5vh 12px", overflowY: "auto" }}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "min(560px, 100%)" }}>
        <div className="topbar" style={{ marginBottom: 8 }}>
          <div className="label">Add booking</div>
          <button type="button" className="btn light" onClick={() => setOpen(false)}>✕</button>
        </div>
        <form action={formAction} key={seed}>
          <input type="hidden" name="jobNumber" value={job} />
          <input type="hidden" name="status" value="Booked in" />
          <div className="form">
            <div className="full">
              <label>Job *</label>
              <JobPicker jobs={jobs} value={job} onChange={setJob} />
            </div>
            <div>
              <label>Booking type</label>
              <select name="type" value={type} onChange={(e) => setType(e.target.value)}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label>Date</label>
              <input type="date" name="scheduledDate" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div>
              <label>Start time{isMeasure ? " *" : ""}</label>
              <input type="time" name="startTime" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <label>End time</label>
              <input type="time" name="endTime" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            {!isMeasure && (
              <div className="full">
                <label>Days required</label>
                <input type="number" name="days" min="0.5" max="60" step="0.5" placeholder="e.g. 3" value={days} onChange={(e) => setDays(e.target.value)} />
                <div className="hint">{last ? `Books ${fmt(new Date(date + "T00:00:00Z"))} to ${fmt(last)} (weekends skipped).` : "Fills that many working days on the calendar."}</div>
              </div>
            )}
            <div className="full">
              <label>Who</label>
              <TeamPicker name="assigneeIds" staff={staff} allowAdd={false} />
            </div>
            <div className="full">
              <label>Notes</label>
              <input name="notes" />
            </div>
          </div>
          {state.error && <div className="authError" style={{ marginTop: 10 }}>{state.error}</div>}
          <div className="actions" style={{ marginTop: 12 }}>
            <button type="submit" className="btn primary" disabled={pending || !job}>{pending ? "Adding…" : "Add booking"}</button>
            <button type="button" className="btn light" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
