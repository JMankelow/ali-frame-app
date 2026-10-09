// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useActionState } from "react";
import { saveJobBrief, type JobBriefState } from "../actions";

const initial: JobBriefState = {};

/** What the customer wants — paste their email or write the instructions. Office can edit; installers read it. */
export function JobBrief({ jobNumber, description, readOnly }: { jobNumber: string; description: string; readOnly: boolean }) {
  const [state, action, pending] = useActionState(saveJobBrief.bind(null, jobNumber), initial);

  if (readOnly) {
    if (!description.trim()) return null;
    return (
      <div className="card" style={{ marginTop: 16 }}>
        <div className="label">What the customer wants</div>
        <div style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{description}</div>
      </div>
    );
  }

  return (
    <form action={action} className="card" style={{ marginTop: 16 }}>
      <div className="label">What the customer wants — email / instructions</div>
      <div className="hint" style={{ marginTop: 4 }}>Paste the customer&apos;s email or write up the instructions. The team on the job can read this.</div>
      <textarea name="description" rows={8} defaultValue={description} placeholder="Paste the enquiry email here, or type what the customer wants…" style={{ width: "100%", marginTop: 8 }} />
      {state.error && <div className="authError" style={{ marginTop: 8 }}>{state.error}</div>}
      <div className="actions" style={{ marginTop: 10 }}>
        <button type="submit" className="btn primary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        {state.saved && <span className="status green">{state.saved}</span>}
      </div>
    </form>
  );
}
