"use client";

import { useActionState } from "react";
import { setupAdmin, type SetupState } from "./actions";
import { AuthCard } from "@/components/AuthCard";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwordPolicy";

const initialState: SetupState = {};

export function SetupForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(setupAdmin, initialState);

  return (
    <AuthCard
      title="Create the first admin account"
      subtitle="This is a one-time setup step. Once this account is created, this page won't work again."
    >
      <form action={formAction} className="authGrid">
        <input type="hidden" name="token" value={token} />
        <div>
          <label htmlFor="name">Your name</label>
          <input id="name" name="name" type="text" required autoComplete="name" />
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
          />
        </div>
        <div>
          <label htmlFor="confirmPassword">Confirm password</label>
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
          {pending ? "Creating account…" : "Create admin account"}
        </button>
      </form>
      <div className="authNote">
        You&apos;ll be sent a login code by email straight after this, same as every sign-in.
      </div>
    </AuthCard>
  );
}
