"use client";

import { useActionState } from "react";
import { acknowledgeOutcome, type ReviewFormState } from "../../actions";

export function AckForm({ reviewId, name, defaultComments }: { reviewId: string; name: string; defaultComments: string }) {
  const [state, action, pending] = useActionState(acknowledgeOutcome.bind(null, reviewId), {} as ReviewFormState);
  return (
    <form action={action} className="noprint" style={{ marginTop: 16, border: "1px solid #b8d7ea", padding: 14 }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>Acknowledge this outcome</div>
      <div className="hint" style={{ marginBottom: 8 }}>
        Signing acknowledges that the discussion took place and the outcome and actions were recorded. It doesn&apos;t necessarily mean you agree with every rating or comment — add yours below.
      </div>
      <label style={{ display: "block", fontWeight: 700, fontSize: 13 }}>Your comments (optional)</label>
      <textarea name="employeeComments" defaultValue={defaultComments} rows={3} style={{ width: "100%", marginBottom: 8 }} />
      <label style={{ display: "block", fontWeight: 700, fontSize: 13 }}>Type your full name to acknowledge</label>
      <input name="signedBy" placeholder={name} autoComplete="off" required style={{ width: "100%", maxWidth: 360 }} />
      {state.error && <div className="authError" style={{ marginTop: 8 }}>{state.error}</div>}
      <div className="actions" style={{ marginTop: 10 }}>
        <button type="submit" className="btn primary" disabled={pending}>{pending ? "Saving…" : "Acknowledge"}</button>
      </div>
    </form>
  );
}
