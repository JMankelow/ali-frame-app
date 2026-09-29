"use client";

import { useState, useTransition } from "react";
import { updateEmployeePhone } from "./actions";

export function PhoneCell({ userId, phone, canEdit }: { userId: string; phone: string | null; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!canEdit) return <>{phone ?? "—"}</>;

  if (!editing) {
    return (
      <span style={{ cursor: "pointer" }} onClick={() => setEditing(true)} title="Click to edit">
        {phone ?? <span className="hint">— add —</span>}
      </span>
    );
  }

  return (
    <form
      action={(fd) => {
        startTransition(() => updateEmployeePhone(userId, fd));
        setEditing(false);
      }}
      style={{ display: "flex", gap: 4 }}
    >
      <input name="phone" defaultValue={phone ?? ""} autoFocus style={{ width: 130 }} disabled={pending} />
      <button type="submit" className="btn light">
        Save
      </button>
    </form>
  );
}
