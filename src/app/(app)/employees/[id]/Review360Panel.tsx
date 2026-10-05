// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createReview360, type ReviewFormState } from "../../reviews/actions";
import { REVIEW_TEMPLATES } from "@/lib/reviewTemplates";

export interface ReviewRow {
  id: string;
  templateName: string;
  period: string;
  status: string;
  selfStatus: string;
  managerStatus: string;
  createdAt: string;
}

export function Review360Panel({
  employeeId,
  employeeName,
  defaultTemplate,
  assessors,
  defaultAssessorId,
  reviews,
  canCreate,
}: {
  employeeId: string;
  employeeName: string;
  defaultTemplate: string;
  assessors: { id: string; name: string }[];
  defaultAssessorId: string;
  reviews: ReviewRow[];
  canCreate: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createReview360, {} as ReviewFormState);
  const inThreeMonths = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
  const inTwoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const color = (s: string) => (s === "Submitted" || s === "Completed" ? "green" : s === "Draft" ? "orange" : "grey");

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="topbar" style={{ marginBottom: 8 }}>
        <div>
          <div className="label">360 Assessments</div>
          <div className="hint">Creating one gives {employeeName.split(" ")[0]} a self assessment (with an alert) and gives the manager a manager assessment.</div>
        </div>
        {canCreate && !open && <button type="button" className="btn primary" onClick={() => setOpen(true)}>+ Create new assessment</button>}
      </div>

      {open && canCreate && (
        <form action={action} style={{ marginTop: 10, borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
          <input type="hidden" name="employeeId" value={employeeId} />
          <div className="form">
            <div>
              <label>Assessment</label>
              <select name="templateKey" defaultValue={defaultTemplate} required>
                {REVIEW_TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.name} competency assessment</option>)}
              </select>
            </div>
            <div>
              <label>Review period</label>
              <input name="period" required defaultValue="12 months to October 2026" />
            </div>
            <div>
              <label>Manager / assessor</label>
              <select name="assessorId" defaultValue={defaultAssessorId} required>
                {assessors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label>Assessment (meeting) date</label>
              <input type="date" name="assessmentDate" />
            </div>
            <div>
              <label>Self assessment due by</label>
              <input type="date" name="selfDueDate" defaultValue={inTwoWeeks} />
            </div>
            <div>
              <label>Next review</label>
              <input type="date" name="nextReviewDate" defaultValue={inThreeMonths} />
            </div>
            <div>
              <label>Current level (optional)</label>
              <input name="currentLevel" placeholder="e.g. Intermediate – Level 2" />
            </div>
            <div>
              <label>Level sought (optional)</label>
              <input name="levelSought" />
            </div>
            <div>
              <label>Primary work location</label>
              <input name="workLocation" defaultValue="Residential and commercial sites, Auckland" />
            </div>
            <div>
              <label>Hours / work pattern</label>
              <input name="hoursPattern" defaultValue="Full time" />
            </div>
          </div>
          {state.error && <div className="authError">{state.error}</div>}
          {state.createdId && (
            <div className="hint" style={{ marginTop: 8, color: "#15803d" }}>
              Created — {employeeName.split(" ")[0]} and the assessor have been alerted.{" "}
              <Link href={`/reviews/${state.createdId}`} style={{ fontWeight: 700 }}>Open it →</Link>
            </div>
          )}
          <div className="actions" style={{ marginTop: 12 }}>
            <button type="submit" className="btn primary" disabled={pending}>{pending ? "Creating…" : "Create self & manager assessment"}</button>
            <button type="button" className="btn light" onClick={() => setOpen(false)}>Close</button>
          </div>
        </form>
      )}

      <table style={{ marginTop: 10 }}>
        <thead><tr><th>Assessment</th><th>Period</th><th>Self</th><th>Manager</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {reviews.map((r) => (
            <tr key={r.id}>
              <td>{r.templateName}</td>
              <td>{r.period}</td>
              <td><span className={`status ${color(r.selfStatus)}`}>{r.selfStatus}</span></td>
              <td><span className={`status ${color(r.managerStatus)}`}>{r.managerStatus}</span></td>
              <td><span className={`status ${color(r.status)}`}>{r.status}</span></td>
              <td><Link href={`/reviews/${r.id}`} className="btn light">Open</Link></td>
            </tr>
          ))}
          {reviews.length === 0 && <tr><td colSpan={6} className="hint">No 360 assessments yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
