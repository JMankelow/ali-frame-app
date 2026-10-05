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
          <div className="full">
            <label>Report title (optional)</label>
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
