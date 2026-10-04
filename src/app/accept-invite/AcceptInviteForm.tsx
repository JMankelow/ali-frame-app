// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useActionState } from "react";
import { acceptInvite, type AcceptInviteState } from "./actions";
import { AuthCard } from "@/components/AuthCard";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwordPolicy";

const initialState: AcceptInviteState = {};

export function AcceptInviteForm({ token, name }: { token: string; name: string }) {
  const [state, formAction, pending] = useActionState(acceptInvite, initialState);

  return (
    <AuthCard title={`Welcome, ${name}`} subtitle="Choose your own password to finish setting up your account.">
      <form action={formAction} className="authGrid">
        <input type="hidden" name="token" value={token} />
        <div>
          <label htmlFor="password">New password</label>
          <input id="password" name="password" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" autoFocus />
        </div>
        <div>
          <label htmlFor="confirmPassword">Confirm new password</label>
          <input id="confirmPassword" name="confirmPassword" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" />
        </div>
        {state.error && <div className="authError">{state.error}</div>}
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? "Saving…" : "Set password"}
        </button>
      </form>
    </AuthCard>
  );
}
