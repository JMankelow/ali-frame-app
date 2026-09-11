"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { AuthCard } from "@/components/AuthCard";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <AuthCard title="Sign in" subtitle="Ali-Frame Job Management System">
      <form action={formAction} className="authGrid">
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" autoFocus />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        {state.error && <div className="authError">{state.error}</div>}
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <div className="authNote">
        After your password, we&apos;ll email you a 6-digit code to finish signing in.
      </div>
    </AuthCard>
  );
}
