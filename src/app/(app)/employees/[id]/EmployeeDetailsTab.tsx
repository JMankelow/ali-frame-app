"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { updateEmployeeDetails, type EmployeeFormState } from "./actions";
import { updateUserRole, setUserSuperUser } from "../../users/actions";
import { ROLE_OPTIONS, ROLE_LABELS } from "@/lib/roles";

const initialState: EmployeeFormState = {};

export function EmployeeDetailsTab({
  userId,
  name,
  email,
  phone,
  role,
  isSuperUser,
  vehicle,
  canEdit,
}: {
  userId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isSuperUser: boolean;
  vehicle: string | null;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const action = updateEmployeeDetails.bind(null, userId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="card">
      <div className="topbar" style={{ marginBottom: editing ? 12 : 0 }}>
        <div className="label">Employee Details</div>
        {canEdit && !editing && (
          <button type="button" className="btn light" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <form action={formAction} style={{ marginTop: 10 }}>
          <div className="form">
            <div>
              <label>Name</label>
              <input name="name" defaultValue={name} required />
            </div>
            <div>
              <label>Email (sign-in + invite address — must be a real mailbox)</label>
              <input name="email" type="email" defaultValue={email} required />
            </div>
            <div>
              <label>Phone</label>
              <input name="phone" defaultValue={phone} />
            </div>
          </div>
          {state.error && <div className="authError">{state.error}</div>}
          <div className="actions" style={{ marginTop: 12 }}>
            <button type="submit" className="btn primary" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </button>
            <button type="button" className="btn light" onClick={() => setEditing(false)}>
              Done
            </button>
          </div>
        </form>
      ) : (
        <div className="form" style={{ marginTop: 10 }}>
          <div>
            <label>Name</label>
            <div>{name}</div>
          </div>
          <div>
            <label>Email</label>
            <div>{email}</div>
          </div>
          <div>
            <label>Phone</label>
            <div>{phone || "—"}</div>
          </div>
          <div>
            <label>Role</label>
            {canEdit ? (
              <select defaultValue={role} onChange={(e) => updateUserRole(userId, e.target.value)}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            ) : (
              <div>{ROLE_LABELS[role] ?? role}</div>
            )}
          </div>
          <div>
            <label>Super User</label>
            {canEdit ? (
              <input
                type="checkbox"
                defaultChecked={isSuperUser}
                onChange={(e) => setUserSuperUser(userId, e.target.checked)}
              />
            ) : (
              <div>{isSuperUser ? "Yes" : "No"}</div>
            )}
          </div>
          <div>
            <label>Assigned Vehicle</label>
            <div>{vehicle ?? "—"}</div>
          </div>
          {canEdit && (
            <div className="full">
              <Link href="/users" style={{ color: "var(--blueDark)", fontWeight: 700, textDecoration: "none" }}>
                Manage section access & login (Settings → Users) ↗
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
