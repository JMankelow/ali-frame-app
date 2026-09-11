"use client";

import { useActionState } from "react";
import { verifyCode, resendCode, type VerifyState } from "./actions";
import { AuthCard } from "@/components/AuthCard";

const initialState: VerifyState = {};

export function VerifyForm() {
  const [state, formAction, pending] = useActionState(verifyCode, initialState);

  return (
    <AuthCard
      title="Enter your login code"
      subtitle="We've emailed you a 6-digit code. It expires in 10 minutes."
    >
      <form action={formAction} className="authGrid">
        <div>
          <label htmlFor="code">6-digit code</label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            autoComplete="one-time-code"
          />
        </div>
        {state.error && <div className="authError">{state.error}</div>}
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? "Checking…" : "Verify and sign in"}
        </button>
      </form>
      <form action={resendCode} style={{ marginTop: 10 }}>
        <button type="submit" className="btn light">
          Resend code
        </button>
      </form>
    </AuthCard>
  );
}
