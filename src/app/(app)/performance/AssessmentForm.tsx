"use client";

import { useActionState, useState } from "react";
import { submitInstallerAssessment, type AssessmentFormState } from "./actions";
import { JobPicker, type JobPickerOption } from "@/components/JobPicker";

const initialState: AssessmentFormState = {};

function ScoreSelect({ name, label }: { name: string; label: string }) {
  return (
    <div>
      <label htmlFor={name}>{label}</label>
      <select id={name} name={name} defaultValue="">
        <option value="">N/A</option>
        <option value="1">1 — Poor</option>
        <option value="2">2 — Below Standard</option>
        <option value="3">3 — Satisfactory</option>
        <option value="4">4 — Good</option>
        <option value="5">5 — Excellent</option>
      </select>
    </div>
  );
}

export function AssessmentForm({
  installers,
  jobs,
  currentUserId,
}: {
  installers: { id: string; name: string }[];
  jobs: JobPickerOption[];
  currentUserId: string;
}) {
  const [state, formAction, pending] = useActionState(submitInstallerAssessment, initialState);
  const [jobNumber, setJobNumber] = useState("");

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="label">New Assessment</div>
      <div className="hint" style={{ marginTop: 4 }}>
        Based on Ali-Frame&apos;s Job Checklist / Competency &amp; KPI 360 Review. Either the installer (self-assessment)
        or a supervisor/HR can submit one — for a specific job, or as a quarterly review.
      </div>
      <form action={formAction} style={{ marginTop: 10 }}>
        <input type="hidden" name="jobNumber" value={jobNumber} />
        <div className="form">
          <div>
            <label htmlFor="revieweeId">Installer Being Assessed</label>
            <select id="revieweeId" name="revieweeId" defaultValue={currentUserId} required>
              {installers.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Job (optional — leave blank for a quarterly review)</label>
            <JobPicker jobs={jobs} value={jobNumber} onChange={setJobNumber} placeholder="Search jobs, or leave blank..." />
          </div>
          <div>
            <label htmlFor="reviewPeriod">Review Period (if quarterly)</label>
            <input id="reviewPeriod" name="reviewPeriod" placeholder="e.g. Q3 2026" />
          </div>
          <div>
            <label htmlFor="overallResult">Overall Result</label>
            <select id="overallResult" name="overallResult" defaultValue="">
              <option value="">—</option>
              <option>Pass</option>
              <option>Pass with Rework</option>
              <option>Fail / Rework Required</option>
            </select>
          </div>

          <ScoreSelect name="coreInstallationScore" label="1. Core Installation Quality" />
          <ScoreSelect name="healthSafetyScore" label="2. Health & Safety & Compliance" />
          <ScoreSelect name="residentialScore" label="3. Residential Competency" />
          <ScoreSelect name="commercialScore" label="4. Commercial Competency" />
          <ScoreSelect name="leadershipScore" label="5. Leadership & Development" />
          <ScoreSelect name="administrationScore" label="6. Administration & Job Requirements" />

          <div>
            <label htmlFor="qualityScore">Overall Quality Score (1-5) — required</label>
            <select id="qualityScore" name="qualityScore" defaultValue="" required>
              <option value="" disabled>
                Select...
              </option>
              <option value="1">1 — Poor</option>
              <option value="2">2 — Below Standard</option>
              <option value="3">3 — Satisfactory</option>
              <option value="4">4 — Good</option>
              <option value="5">5 — Excellent</option>
            </select>
          </div>

          <div className="full">
            <label htmlFor="keyWins">Key Wins</label>
            <textarea id="keyWins" name="keyWins" rows={2} />
          </div>
          <div className="full">
            <label htmlFor="keyIssues">Key Issues / Defects</label>
            <textarea id="keyIssues" name="keyIssues" rows={2} />
          </div>
          <div className="full">
            <label htmlFor="actionsRequired">Actions Required / Who / By When</label>
            <textarea id="actionsRequired" name="actionsRequired" rows={2} />
          </div>
        </div>
        {state.error && <div className="authError">{state.error}</div>}
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? "Submitting…" : "Submit Assessment"}
          </button>
        </div>
      </form>
    </div>
  );
}
