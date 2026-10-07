"use client";

import { useState, useTransition } from "react";
import { deactivateUser, reactivateUser, setUserPermissions, setUserSuperUser, updateUserRole } from "./actions";
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
}

const isFieldRole = (role: string) => INSTALLER_ROLES.includes(role);

/** One list for everyone: who they are, their role, which sections they can see, and the invite / deactivate actions. */
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
              <th style={{ minWidth: 160 }}>Person</th>
              <th style={{ minWidth: 150 }}>Role</th>
              <th style={{ minWidth: 110 }}>Status</th>
              <th style={{ minWidth: 280 }}>Can see</th>
              <th style={{ minWidth: 140 }}></th>
            </tr>
          </thead>
          <tbody>
            {group("Office & management", "full access follows the ticks", office)}
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
    padding: "3px 10px",
    fontSize: 12,
    fontWeight: 700,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.7 : 1,
  });

  return (
    <tr style={row.isActive ? undefined : { opacity: 0.6 }}>
      <td>
        <div style={{ fontWeight: 800 }}>
          {row.name}
          {isSelf && <span className="hint"> (you)</span>}
        </div>
        <div className="hint">{row.email}</div>
      </td>
      <td>
        <select
          value={role}
          disabled={locked}
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
        <span className={`status ${row.isActive ? "green" : "grey"}`}>{row.isActive ? "Active" : "Deactivated"}</span>
        <div className="hint" style={{ marginTop: 4 }}>{row.mustResetPassword ? "Hasn't signed in yet" : "Signed in"}</div>
      </td>
      <td>
        {!row.isActive ? (
          <span className="hint">—</span>
        ) : field ? (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {INSTALLER_SECTIONS.map((s) => (
              <span key={s} style={chip(true, true)}>{s}</span>
            ))}
          </div>
        ) : superUser ? (
          <div>
            <span style={chip(true, true)}>Everything (Super User)</span>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {SECTIONS.map((s) => (
              <button key={s} type="button" disabled={locked} onClick={() => toggleSection(s)} style={chip(selected.includes(s), locked)}>
                {s}
              </button>
            ))}
          </div>
        )}
        {row.isActive && !field && !isSelf && (
          <label style={{ display: "inline-flex", gap: 6, alignItems: "center", marginTop: 8, fontSize: 12, fontWeight: 600, textTransform: "none" }}>
            <input
              type="checkbox"
              checked={superUser}
              disabled={locked}
              onChange={(e) => {
                setSuperUser(e.target.checked);
                startTransition(() => setUserSuperUser(row.id, e.target.checked));
              }}
            />
            Super User (sees everything)
          </label>
        )}
      </td>
      <td>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
          {row.isActive && <InviteButton userId={row.id} firstLoginDone={!row.mustResetPassword} />}
          {row.isActive ? (
            <button type="button" className="btn light" disabled={pending || isSelf} onClick={() => startTransition(() => deactivateUser(row.id))} style={{ color: "#b91c1c" }}>
              Deactivate
            </button>
          ) : (
            <button type="button" className="btn light" disabled={pending} onClick={() => startTransition(() => reactivateUser(row.id))}>
              Reactivate
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
