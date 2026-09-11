"use client";

import { useActionState } from "react";
import { resetPassword, type ResetPasswordState } from "./actions";
import { AuthCard } from "@/components/AuthCard";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwordPolicy";

const initialState: ResetPasswordState = {};

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(resetPassword, initialState);

  return (
    <AuthCard
      title="Set your password"
      subtitle="This is your first sign-in — choose your own password to continue."
    >
      <form action={formAction} className="authGrid">
        <div>
          <label htmlFor="password">New password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="confirmPassword">Confirm new password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
          />
        </div>
        {state.error && <div className="authError">{state.error}</div>}
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? "Saving…" : "Set password and continue"}
        </button>
      </form>
    </AuthCard>
  );
}
