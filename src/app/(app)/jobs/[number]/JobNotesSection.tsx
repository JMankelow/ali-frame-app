"use client";

import { useActionState } from "react";
import { createJobNote, type JobNoteState } from "../actions";

export interface JobFeedItem {
  id: string;
  kind: "note" | "audit";
  text: string;
  authorName: string;
  createdAt: string;
}

const initialState: JobNoteState = {};

export function JobNotesSection({ jobNumber, feed }: { jobNumber: string; feed: JobFeedItem[] }) {
  const action = createJobNote.bind(null, jobNumber);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="card">
      <div className="label">Notes &amp; Audit Trail</div>
      <div className="hint" style={{ marginTop: 4 }}>
        Anyone can add a note here. Everything else that happens on this job — status changes, emails sent, bookings
        added, orders placed — is logged here automatically.
      </div>

      <form action={formAction} style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <input name="text" placeholder="Add a note…" required style={{ flex: 1 }} />
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? "Adding…" : "Add Note"}
        </button>
      </form>
      {state.error && <div className="authError">{state.error}</div>}

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {feed.map((f) => (
          <div
            key={f.id}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              padding: "6px 0",
              borderBottom: "1px solid #f0f1f4",
            }}
          >
            <span className={`status ${f.kind === "note" ? "blue" : "grey"}`} style={{ flexShrink: 0 }}>
              {f.kind === "note" ? "Note" : "Activity"}
            </span>
            <div style={{ flex: 1 }}>
              <div>{f.text}</div>
              <div className="hint" style={{ marginTop: 2 }}>
                {f.authorName} — {new Date(f.createdAt).toLocaleString("en-NZ")}
              </div>
            </div>
          </div>
        ))}
        {feed.length === 0 && <div className="hint">Nothing recorded for this job yet.</div>}
      </div>
    </div>
  );
}
