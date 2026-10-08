"use client";

import { useActionState } from "react";
import { verifyCode, resendCode, type VerifyState } from "./actions";
import { AuthCard } from "@/components/AuthCard";

const initialState: VerifyState = {};

export function VerifyForm({ mode }: { mode: "email" | "app" }) {
  const [state, formAction, pending] = useActionState(verifyCode, initialState);

  return (
    <AuthCard
      title="Enter your login code"
      subtitle={mode === "app" ? "Open your authenticator app and enter the 6-digit code for Ali-Frame (or use a recovery code)." : "We've emailed you a 6-digit code. It expires in 10 minutes."}
    >
      <form action={formAction} className="authGrid">
        <div>
          <label htmlFor="code">6-digit code</label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            pattern={mode === "app" ? undefined : "[0-9]{6}"}
            maxLength={mode === "app" ? 12 : 6}
            required
            autoFocus
            autoComplete="one-time-code"
          />
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 600, textTransform: "none" }}>
          <input type="checkbox" name="remember" /> Remember this device for 30 days (only on your own phone or computer)
        </label>
        {state.error && <div className="authError">{state.error}</div>}
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? "Checking…" : "Verify and sign in"}
        </button>
      </form>
      {mode === "email" && (
        <form action={resendCode} style={{ marginTop: 10 }}>
          <button type="submit" className="btn light">
            Resend code
          </button>
        </form>
      )}
    </AuthCard>
  );
}
