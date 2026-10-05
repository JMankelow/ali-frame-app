// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useState } from "react";
import { JobPicker, type JobPickerOption } from "@/components/JobPicker";
import { createQaReport } from "./actions";
import { createQaSheet } from "./sheetActions";

export function NewQaReportForm({ jobs }: { jobs: JobPickerOption[] }) {
  const [jobNumber, setJobNumber] = useState("");
  return (
    <div className="card">
      <div className="label">Create report — select the job, then choose the type</div>
      <form action={createQaReport} style={{ marginTop: 8 }}>
        <input type="hidden" name="jobNumber" value={jobNumber} />
        <div className="form">
          <div className="full">
            <label>Select job</label>
            <JobPicker jobs={jobs} value={jobNumber} onChange={setJobNumber} />
          </div>
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
          <div className="full">
            <label>Photo report title (optional — photo report only)</label>
            <input name="title" placeholder="Installation QA Report" />
          </div>
        </div>
        <div className="actions" style={{ marginTop: 10, flexWrap: "wrap" }}>
          <button type="submit" formAction={createQaSheet} name="kind" value="RESIDENTIAL" className="btn primary" disabled={!jobNumber}>Residential QA check sheet</button>
          <button type="submit" formAction={createQaSheet} name="kind" value="COMMERCIAL" className="btn primary" disabled={!jobNumber}>Commercial QA check sheet</button>
          <button type="submit" className="btn light" disabled={!jobNumber}>QA photo report (label &amp; describe photos)</button>
        </div>
      </form>
    </div>
  );
}
