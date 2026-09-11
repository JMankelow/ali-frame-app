"use client";

import { useActionState } from "react";
import { createUser, type UserFormState } from "./actions";

const initialState: UserFormState = {};

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "ADMIN_MANAGEMENT", label: "Admin / Management" },
  { value: "OFFICE_SCHEDULING", label: "Office / Scheduling" },
  { value: "SALES", label: "Sales" },
  { value: "SENIOR_INSTALLER", label: "Senior Installer" },
  { value: "CREW_MOBILE", label: "Crew Mobile" },
  { value: "READ_ONLY", label: "Read Only" },
];

export function UserForm() {
  const [state, formAction, pending] = useActionState(createUser, initialState);

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="label">Add Staff Account</div>
      <form action={formAction} className="form" style={{ marginTop: 10 }}>
        <div>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" required />
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required />
        </div>
        <div>
          <label htmlFor="role">Role</label>
          <select id="role" name="role" defaultValue="READ_ONLY">
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        {state.error && <div className="authError">{state.error}</div>}
        <div className="full actions">
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? "Creating…" : "Create Account"}
          </button>
        </div>
      </form>
      {state.createdTempPassword && (
        <div className="authNote" style={{ marginTop: 12 }}>
          Account created for <strong>{state.createdEmail}</strong>. One-time temporary
          password (give this to them directly — it is not shown again and not emailed):
          <br />
          <code style={{ fontSize: 15, fontWeight: 800 }}>{state.createdTempPassword}</code>
          <br />
          They&apos;ll be forced to set their own password on first sign-in, then verify by
          email code same as everyone else.
        </div>
      )}
    </div>
  );
}
