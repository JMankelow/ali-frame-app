"use client";

import { useActionState } from "react";
import { postWipNow, type PostWipState } from "./actions";

const initialState: PostWipState = {};

export function PostWipButton() {
  const [state, formAction, pending] = useActionState(postWipNow, initialState);

  return (
    <form action={formAction}>
      <button type="submit" className="btn primary" disabled={pending}>
        {pending ? "Posting to Xero…" : "Post WIP Journal Now"}
      </button>
      {state.success && <div className="hint" style={{ marginTop: 6 }}>Draft journal (+ reversal) created in Xero — review and approve it there.</div>}
      {state.error && <div className="authError" style={{ marginTop: 6 }}>{state.error}</div>}
    </form>
  );
}
