// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useState } from "react";
import { JobPicker, type JobPickerOption } from "@/components/JobPicker";
import { createQaReport } from "./actions";

export function NewQaReportForm({ jobs }: { jobs: JobPickerOption[] }) {
  const [jobNumber, setJobNumber] = useState("");
  return (
    <div className="card">
      <div className="label">Create report</div>
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
        <div className="actions" style={{ marginTop: 10 }}>
          <button type="submit" className="btn primary" disabled={!jobNumber}>Create report &amp; add photos</button>
        </div>
      </form>
    </div>
  );
}
