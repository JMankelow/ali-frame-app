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

/** One list for everything about a person: who they are, invite / reset, role, which sections they can see, and (de)activate. */
export function PermissionsMatrix({ rows, currentUserId }: { rows: PermissionRow[]; currentUserId: string }) {
  return (
    <div className="card">
      <div className="label">Users &amp; access</div>
      <div className="hint" style={{ marginTop: 4 }}>
        Everyone in one list. Ticking a section applies the moment you tick it, from that person&apos;s next page load. Field staff
        (installers, crew, contractors) can only ever have <b>Installers</b> and <b>Communications</b>.
      </div>

      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>First login</th>
              <th>Invite</th>
              <th>Super User</th>
              <th>Select All</th>
              {SECTIONS.map((s) => (
                <th key={s}>{s}</th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <UserRow key={row.id} row={row} isSelf={row.id === currentUserId} />
            ))}
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
  const isField = INSTALLER_ROLES.includes(role);
  const [selected, setSelected] = useState<string[]>(
    INSTALLER_ROLES.includes(row.role) ? [...INSTALLER_SECTIONS] : row.permissions.length === 0 ? [...SECTIONS] : row.permissions,
  );

  const grantable = isField ? SECTIONS.filter((s) => INSTALLER_SECTIONS.includes(s)) : [...SECTIONS];
  const allSelected = grantable.every((s) => selected.includes(s));
  const disabled = !row.isActive || superUser || pending || isSelf;

  function save(next: string[]) {
    const clean = isField ? next.filter((s) => INSTALLER_SECTIONS.includes(s)) : next;
    setSelected(clean);
    startTransition(() => setUserPermissions(row.id, clean));
  }

  function toggleSection(section: string) {
    save(selected.includes(section) ? selected.filter((s) => s !== section) : [...selected, section]);
  }

  function toggleAll() {
    save(allSelected ? [] : [...grantable]);
  }

  return (
    <tr style={row.isActive ? undefined : { opacity: 0.55 }}>
      <td style={{ fontWeight: 700 }}>
        {row.name}
        {isSelf && <span className="hint"> (you)</span>}
      </td>
      <td>{row.email}</td>
      <td>
        <select
          value={role}
          disabled={!row.isActive || pending || isSelf}
          onChange={(e) => {
            const v = e.target.value;
            setRole(v);
            if (INSTALLER_ROLES.includes(v)) setSelected([...INSTALLER_SECTIONS]);
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
      </td>
      <td>{row.mustResetPassword ? "Pending" : "Done"}</td>
      <td>{row.isActive && <InviteButton userId={row.id} firstLoginDone={!row.mustResetPassword} />}</td>
      <td>
        <input
          type="checkbox"
          checked={superUser}
          disabled={!row.isActive || pending || isSelf || isField}
          onChange={(e) => {
            setSuperUser(e.target.checked);
            startTransition(() => setUserSuperUser(row.id, e.target.checked));
          }}
        />
      </td>
      <td>
        <input type="checkbox" checked={superUser || allSelected} disabled={disabled} onChange={toggleAll} />
      </td>
      {SECTIONS.map((s) => {
        const allowed = !isField || INSTALLER_SECTIONS.includes(s);
        return (
          <td key={s}>
            <input
              type="checkbox"
              checked={allowed && (superUser || selected.includes(s))}
              disabled={disabled || !allowed}
              onChange={() => toggleSection(s)}
            />
          </td>
        );
      })}
      <td>
        {row.isActive ? (
          <button type="button" className="btn danger" disabled={pending || isSelf} onClick={() => startTransition(() => deactivateUser(row.id))}>
            Deactivate
          </button>
        ) : (
          <button type="button" className="btn light" disabled={pending} onClick={() => startTransition(() => reactivateUser(row.id))}>
            Reactivate
          </button>
        )}
      </td>
    </tr>
  );
}
