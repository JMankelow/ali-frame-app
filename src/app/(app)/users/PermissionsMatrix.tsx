"use client";

import { useState, useTransition } from "react";
import { setUserPermissions, setUserSuperUser, updateUserRole } from "./actions";
import { SECTIONS } from "@/lib/permissions";

export interface PermissionRow {
  id: string;
  name: string;
  role: string;
  isSuperUser: boolean;
  permissions: string[];
}

const ROLE_OPTIONS = ["ADMIN_MANAGEMENT", "OFFICE_SCHEDULING", "SALES", "SENIOR_INSTALLER", "CREW_MOBILE", "READ_ONLY"];
const ROLE_LABELS: Record<string, string> = {
  ADMIN_MANAGEMENT: "Admin / Management",
  OFFICE_SCHEDULING: "Office / Scheduling",
  SALES: "Sales",
  SENIOR_INSTALLER: "Senior Installer",
  CREW_MOBILE: "Crew Mobile",
  READ_ONLY: "Read Only",
};

export function PermissionsMatrix({ rows, currentUserId }: { rows: PermissionRow[]; currentUserId: string }) {
  return (
    <div className="card">
      <div className="label">User Access</div>
      <div className="hint" style={{ marginTop: 4 }}>
        Which sections of the app each person can see. Shared and real — this applies the moment you save it, for
        that person's next page load, wherever they are.
      </div>

      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Super User</th>
              <th>Select All</th>
              {SECTIONS.map((s) => (
                <th key={s}>{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <UserPermissionRow key={row.id} row={row} isSelf={row.id === currentUserId} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserPermissionRow({ row, isSelf }: { row: PermissionRow; isSelf: boolean }) {
  const [pending, startTransition] = useTransition();
  const [superUser, setSuperUser] = useState(row.isSuperUser);
  const [selected, setSelected] = useState<string[]>(row.permissions.length === 0 ? [...SECTIONS] : row.permissions);

  const allSelected = SECTIONS.every((s) => selected.includes(s));
  const disabled = superUser || pending || isSelf;

  function save(next: string[]) {
    setSelected(next);
    startTransition(() => setUserPermissions(row.id, next));
  }

  function toggleSection(section: string) {
    save(selected.includes(section) ? selected.filter((s) => s !== section) : [...selected, section]);
  }

  function toggleAll() {
    save(allSelected ? [] : [...SECTIONS]);
  }

  return (
    <tr>
      <td style={{ fontWeight: 700 }}>
        {row.name}
        {isSelf && <span className="hint"> (you)</span>}
      </td>
      <td>
        <select
          defaultValue={row.role}
          disabled={pending || isSelf}
          onChange={(e) => startTransition(() => updateUserRole(row.id, e.target.value))}
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          type="checkbox"
          checked={superUser}
          disabled={pending || isSelf}
          onChange={(e) => {
            setSuperUser(e.target.checked);
            startTransition(() => setUserSuperUser(row.id, e.target.checked));
          }}
        />
      </td>
      <td>
        <input type="checkbox" checked={superUser || allSelected} disabled={disabled} onChange={toggleAll} />
      </td>
      {SECTIONS.map((s) => (
        <td key={s}>
          <input
            type="checkbox"
            checked={superUser || selected.includes(s)}
            disabled={disabled}
            onChange={() => toggleSection(s)}
          />
        </td>
      ))}
    </tr>
  );
}
