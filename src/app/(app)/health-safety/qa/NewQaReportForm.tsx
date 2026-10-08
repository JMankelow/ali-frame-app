// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useState } from "react";
import { JobPicker, type JobPickerOption } from "@/components/JobPicker";
import { createQaReport } from "./actions";
import { createQaSheet, getScheduleOptions, previewSchedule, type ScheduleOptions } from "./sheetActions";

type Item = { n: number; code: string; frame: string; size: string };

export function NewQaReportForm({ jobs }: { jobs: JobPickerOption[] }) {
  const [jobNumber, setJobNumber] = useState("");
  const [opts, setOpts] = useState<ScheduleOptions | null>(null);
  const [fileId, setFileId] = useState("");
  const [items, setItems] = useState<Item[] | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function pickJob(n: string) {
    setJobNumber(n);
    setFileId("");
    setItems(null);
    setMsg("");
    setOpts(null);
    if (!n) return;
    setOpts(await getScheduleOptions(n));
  }

  async function pickFile(id: string) {
    setFileId(id);
    setItems(null);
    setMsg("");
    if (!id) return;
    setBusy(true);
    const r = await previewSchedule(jobNumber, id);
    setBusy(false);
    if (r.items) setItems(r.items);
    else {
      setMsg(r.error ?? "Couldn't read that file.");
      setFileId("");
    }
  }

  const commercial = opts?.jobType === "COMMERCIAL";

  return (
    <div className="card">
      <div className="label">Create report — select the job, pick its schedule, then choose the type</div>
      <form action={createQaReport} style={{ marginTop: 8 }}>
        <input type="hidden" name="jobNumber" value={jobNumber} />
        <input type="hidden" name="scheduleFileId" value={fileId} />
        <div className="form">
          <div className="full">
            <label>Select job</label>
            <JobPicker jobs={jobs} value={jobNumber} onChange={pickJob} />
            {opts?.jobType && (
              <div className="hint" style={{ marginTop: 4 }}>
                Job {jobNumber} is a <b>{commercial ? "Commercial" : "Residential"}</b> job — use the {commercial ? "Commercial" : "Residential"} check sheet below.
              </div>
            )}
          </div>

          {jobNumber && opts?.jobType !== "RESIDENTIAL" && (
            <div className="full">
              <label>Schedule — pick it and the items are filled in for you (window codes, frame type and size)</label>
              <select value={fileId} onChange={(e) => pickFile(e.target.value)} disabled={!opts || busy}>
                <option value="">{!opts ? "Loading…" : opts.files?.length ? "No schedule — I'll type the items in" : "No PDFs on this job yet — I'll type the items in"}</option>
                {opts?.files?.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.type})</option>)}
              </select>
              {busy && <div className="hint">Reading the schedule…</div>}
              {msg && <div className="authError" style={{ marginTop: 6 }}>{msg}</div>}
              {items && (
                <div className="hint" style={{ marginTop: 6 }}>
                  <b>{items.length} items found:</b> {items.map((i) => i.code || `Item ${i.n}`).join(", ")}. The check sheet will be built with these — you can still edit or add items afterwards.
                </div>
              )}
            </div>
          )}

          {opts?.jobType === "RESIDENTIAL" && (
            <div className="hint full">A Residential QA is one check sheet for the whole job — no items to set up. (Items and schedules are for Commercial jobs.)</div>
          )}
          {!items && opts?.jobType !== "RESIDENTIAL" && (
            <>
              <div>
                <label>How many items (windows/doors) on this job?</label>
                <input name="itemCount" type="number" min={1} max={60} defaultValue={1} />
                <div className="hint">The check sheet is built with that many items — you can add more later.</div>
              </div>
              <div className="full">
                <label>Item names / window codes (optional — one per line, in order)</label>
                <textarea name="itemLabels" rows={3} placeholder={"2A.200.W10\n2A.200.W11\nLounge slider"} />
                <div className="hint">If you give names or codes, the items are named from them (the number above is ignored if there are more lines).</div>
              </div>
            </>
          )}
          <div className="full">
            <label>Photo report title (optional — photo report only)</label>
            <input name="title" placeholder="Installation QA Report" />
          </div>
        </div>
        <div className="actions" style={{ marginTop: 10, flexWrap: "wrap" }}>
          <button type="submit" formAction={createQaSheet} name="kind" value="RESIDENTIAL" className={`btn ${opts && !commercial ? "primary" : "light"}`} disabled={!jobNumber}>Residential QA check sheet</button>
          <button type="submit" formAction={createQaSheet} name="kind" value="COMMERCIAL" className={`btn ${commercial ? "primary" : "light"}`} disabled={!jobNumber}>Commercial QA check sheet</button>
          <button type="submit" className="btn light" disabled={!jobNumber}>QA photo report (label &amp; describe photos)</button>
        </div>
      </form>
    </div>
  );
}
