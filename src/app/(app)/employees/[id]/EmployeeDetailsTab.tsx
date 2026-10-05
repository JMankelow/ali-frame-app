"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { updateEmployeeDetails, type EmployeeFormState } from "./actions";
import { updateUserRole, setUserSuperUser } from "../../users/actions";
import { ROLE_OPTIONS, ROLE_LABELS } from "@/lib/roles";

const initialState: EmployeeFormState = {};

export interface EmployeeDetailData {
  preferredName: string;
  personalEmail: string;
  address: string;
  jobTitle: string;
  startDate: string;
  finishDate: string;
  inviteTo: string;
  isManagement: boolean;
  hoursPerWeek: number | null;
  payRate: number | null;
  payType: string;
  annualSalary: number | null;
}

const money = (v: number | null) => (v == null ? "—" : v.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }));

export function EmployeeDetailsTab({
  userId,
  name,
  email,
  phone,
  role,
  isSuperUser,
  vehicle,
  canEdit,
  showPay,
  detail,
}: {
  userId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isSuperUser: boolean;
  vehicle: string | null;
  canEdit: boolean;
  showPay: boolean;
  detail: EmployeeDetailData | null;
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
            <div>
              <label>Personal email</label>
              <input name="personalEmail" type="email" defaultValue={detail?.personalEmail ?? ""} />
            </div>
            <div>
              <label>Send invites &amp; alerts to</label>
              <select name="inviteTo" defaultValue={detail?.inviteTo ?? "work"}>
                <option value="work">Work email</option>
                <option value="personal">Personal email</option>
              </select>
            </div>
            <div>
              <label>Preferred name</label>
              <input name="preferredName" defaultValue={detail?.preferredName ?? ""} />
            </div>
            <div>
              <label>Job title</label>
              <input name="jobTitle" defaultValue={detail?.jobTitle ?? ""} />
            </div>
            <div className="full">
              <label>Home address</label>
              <input name="address" defaultValue={detail?.address ?? ""} />
            </div>
            <div>
              <label>Start date</label>
              <input name="startDate" type="date" defaultValue={detail?.startDate ?? ""} />
            </div>
            <div>
              <label>Finish date</label>
              <input name="finishDate" type="date" defaultValue={detail?.finishDate ?? ""} />
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
          {detail && (
            <>
              <div><label>Personal email</label><div>{detail.personalEmail || "—"}</div></div>
              <div><label>Invites &amp; alerts go to</label><div>{detail.inviteTo === "personal" ? "Personal email" : "Work email"}</div></div>
              <div><label>Job title</label><div>{detail.jobTitle || "—"}</div></div>
              <div><label>Preferred name</label><div>{detail.preferredName || "—"}</div></div>
              <div><label>Start date</label><div>{detail.startDate ? new Date(detail.startDate).toLocaleDateString("en-NZ") : "—"}</div></div>
              <div><label>Hours per week</label><div>{detail.hoursPerWeek ?? "—"}</div></div>
              <div className="full"><label>Home address</label><div>{detail.address || "—"}</div></div>
              {showPay && (
              <div className="full">
                <label>Pay (confidential)</label>
                <div>
                  {detail.isManagement
                    ? "Not held here — management pay is kept out of the employment details."
                    : detail.payRate != null
                      ? `${money(detail.payRate)} ${detail.payType || ""}${detail.annualSalary ? ` · ${money(detail.annualSalary)} a year` : ""}`
                      : "—"}
                </div>
              </div>
              )}
            </>
          )}
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
