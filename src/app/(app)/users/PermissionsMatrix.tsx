"use client";

import { useState, useTransition } from "react";
import { deactivateUser, reactivateUser, resetUserAuthenticator, setUserPermissions, setUserSuperUser, updateUserRole } from "./actions";
import { InviteButton } from "./InviteButtons";
import { INSTALLER_ROLES, INSTALLER_SECTIONS, SECTIONS } from "@/lib/permissions";
import { ROLE_OPTIONS, ROLE_LABELS } from "@/lib/roles";

export interface PermissionRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  mustResetPassword: boolean;
  isSuperUser: boolean;
  permissions: string[];
  totpEnabled: boolean;
}

const isFieldRole = (role: string) => INSTALLER_ROLES.includes(role);
// Short labels so all nine sections fit on one line (hover for the full name).
const SHORT: Record<string, string> = {
  Sales: "Sales", Jobs: "Jobs", Operations: "Ops", "Human Resources": "HR", Accounts: "Accounts",
  Marketing: "Mktg", Communications: "Comms", Installers: "Installers", Settings: "Settings",
};

/** One line per person: who, role, sections they can see, and the actions. */
export function PermissionsMatrix({ rows, currentUserId }: { rows: PermissionRow[]; currentUserId: string }) {
  const active = rows.filter((r) => r.isActive);
  const office = active.filter((r) => !isFieldRole(r.role));
  const field = active.filter((r) => isFieldRole(r.role));
  const inactive = rows.filter((r) => !r.isActive);

  const group = (title: string, note: string, list: PermissionRow[]) =>
    list.length === 0 ? null : (
      <>
        <tr className="usersGroupRow">
          <td colSpan={5}>
            <b>{title}</b> <span className="hint">— {note}</span>
          </td>
        </tr>
        {list.map((row) => (
          <UserRow key={row.id} row={row} isSelf={row.id === currentUserId} />
        ))}
      </>
    );

  return (
    <div className="card">
      <div className="label">Users &amp; access</div>
      <div className="hint" style={{ marginTop: 4 }}>
        Click a section to switch it on or off — it applies from that person&apos;s next page load. Installers, crew and contractors can only
        ever have Installers and Communications.
      </div>

      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <table className="usersTable">
          <thead>
            <tr>
              <th>Person</th>
              <th>Role</th>
              <th>Can see</th>
              <th>Super</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {group("Office & management", "full access follows the sections ticked", office)}
            {group("Field staff", "installers, crew and contractors — fixed to Installers + Communications", field)}
            {group("Deactivated", "can't sign in", inactive)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserRow({ row, isSelf }: { row: PermissionRow; isSelf: boolean }) {
  const [pending, startTransition] = useTransition();
  const [superUser, setSuperUser] = useState(row.isSuperUser);
  const [role, setRole] = useState(row.role);
  const field = isFieldRole(role);
  const [selected, setSelected] = useState<string[]>(
    isFieldRole(row.role) ? [...INSTALLER_SECTIONS] : row.permissions.length === 0 ? [...SECTIONS] : row.permissions,
  );
  const locked = !row.isActive || pending || isSelf;

  function toggleSection(section: string) {
    const next = selected.includes(section) ? selected.filter((s) => s !== section) : [...selected, section];
    setSelected(next);
    startTransition(() => setUserPermissions(row.id, next));
  }

  const chip = (on: boolean, disabled: boolean) => ({
    border: `1.5px solid ${on ? "#0057b8" : "#cfd8e3"}`,
    background: on ? "#0057b8" : "#fff",
    color: on ? "#fff" : "#667085",
    borderRadius: 999,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 700,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.75 : 1,
    whiteSpace: "nowrap" as const,
  });
  const small = { padding: "4px 10px", fontSize: 12 };

  return (
    <tr style={row.isActive ? undefined : { opacity: 0.6 }}>
      <td>
        <div style={{ fontWeight: 800 }}>
          {row.name}
          {isSelf && <span className="hint"> (you)</span>}
        </div>
        <div className="hint">
          {row.email} · <span style={{ color: row.mustResetPassword ? "#b45309" : "#1f8a4c", fontWeight: 700 }}>{row.mustResetPassword ? "not signed in yet" : "signed in"}</span>{row.totpEnabled && " · 🔐 app"}
        </div>
      </td>
      <td>
        <select
          value={role}
          disabled={locked}
          style={{ padding: "5px 8px", fontSize: 13 }}
          onChange={(e) => {
            const v = e.target.value;
            setRole(v);
            if (isFieldRole(v)) {
              setSelected([...INSTALLER_SECTIONS]);
              setSuperUser(false);
            }
            startTransition(() => updateUserRole(row.id, v));
          }}
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </td>
      <td>
        {!row.isActive ? (
          <span className="hint">—</span>
        ) : field ? (
          <div style={{ display: "flex", gap: 4, flexWrap: "nowrap" }}>
            {INSTALLER_SECTIONS.map((s) => (
              <span key={s} style={chip(true, true)}>{SHORT[s] ?? s}</span>
            ))}
          </div>
        ) : superUser ? (
          <span style={chip(true, true)}>Everything</span>
        ) : (
          <div style={{ display: "flex", gap: 4, flexWrap: "nowrap" }}>
            {SECTIONS.map((s) => (
              <button key={s} type="button" title={s} disabled={locked} onClick={() => toggleSection(s)} style={chip(selected.includes(s), locked)}>
                {SHORT[s] ?? s}
              </button>
            ))}
          </div>
        )}
      </td>
      <td style={{ textAlign: "center" }}>
        {row.isActive && !field ? (
          <input
            type="checkbox"
            title="Super User — sees everything"
            checked={superUser}
            disabled={locked}
            onChange={(e) => {
              setSuperUser(e.target.checked);
              startTransition(() => setUserSuperUser(row.id, e.target.checked));
            }}
          />
        ) : (
          <span className="hint">—</span>
        )}
      </td>
      <td>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-start", flexWrap: "nowrap" }}>
          {row.isActive && <InviteButton userId={row.id} firstLoginDone={!row.mustResetPassword} small />}
          {row.isActive && row.totpEnabled && !isSelf && (
            <button type="button" className="btn light" disabled={pending} title="Lost their phone? Switches their authenticator app off" style={small} onClick={() => { if (window.confirm(`Reset ${row.name}'s authenticator app? They'll go back to emailed codes.`)) startTransition(() => resetUserAuthenticator(row.id)); }}>
              Reset app
            </button>
          )}
          {row.isActive ? (
            <button type="button" className="btn light" disabled={pending || isSelf} onClick={() => startTransition(() => deactivateUser(row.id))} style={{ ...small, color: "#b91c1c" }}>
              Deactivate
            </button>
          ) : (
            <button type="button" className="btn light" disabled={pending} onClick={() => startTransition(() => reactivateUser(row.id))} style={small}>
              Reactivate
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
