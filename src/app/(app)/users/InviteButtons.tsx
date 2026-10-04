// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useState, useTransition } from "react";
import { sendInvite, sendAllPendingInvites } from "./actions";

export function InviteButton({ userId, firstLoginDone }: { userId: string; firstLoginDone: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  return (
    <div>
      <button
        type="button"
        className="btn light"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await sendInvite(userId);
            setMessage(r.sent ? "Invite sent." : r.error ?? "Failed.");
          })
        }
      >
        {pending ? "Sending…" : firstLoginDone ? "Send reset link" : "Send invite"}
      </button>
      {message && <div className="hint">{message}</div>}
    </div>
  );
}

export function InviteAllButton({ pendingCount }: { pendingCount: number }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="label">Staff invites</div>
      <div className="hint" style={{ marginTop: 4 }}>
        {pendingCount} account(s) haven't set their own password yet. Each person gets a one-time link by email to
        choose their own — no password is ever sent or shown. Check each email address is correct first (Employees
        → click a name).
      </div>
      <div className="actions" style={{ marginTop: 10 }}>
        <button
          type="button"
          className="btn primary"
          disabled={pending || pendingCount === 0}
          onClick={() => {
            if (!window.confirm(`Email an invite to ${pendingCount} people?`)) return;
            startTransition(async () => {
              const r = await sendAllPendingInvites();
              setMessage(`Sent ${r.sent}.${r.failed.length ? " Failed: " + r.failed.join("; ") : ""}`);
            });
          }}
        >
          {pending ? "Sending…" : "Invite everyone pending"}
        </button>
      </div>
      {message && <div className="hint" style={{ marginTop: 8 }}>{message}</div>}
    </div>
  );
}
