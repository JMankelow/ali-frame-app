"use client";

import { useState } from "react";
import { createUser } from "@/app/(app)/users/actions";

export interface TeamPickerOption {
  id: string;
  name: string;
}

/** Search-and-pick staff: type a name, click it to add; each person added shows as a chip that can be removed. */
export function TeamPicker({
  name,
  staff,
  defaultSelectedIds = [],
  allowAdd = true,
}: {
  name: string;
  staff: TeamPickerOption[];
  defaultSelectedIds?: string[];
  /** Show "+ Add Installer" at the bottom of the list (off where only existing staff should be picked). */
  allowAdd?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [localStaff, setLocalStaff] = useState(staff);
  const [selected, setSelected] = useState<string[]>(defaultSelectedIds);
  const [search, setSearch] = useState("");
  const [addingOpen, setAddingOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const term = search.trim().toLowerCase();
  const matches = localStaff.filter((s) => !selected.includes(s.id) && (!term || s.name.toLowerCase().includes(term)));
  const chosen = selected.map((id) => localStaff.find((s) => s.id === id)).filter((s): s is TeamPickerOption => !!s);

  function add(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setSearch("");
  }
  function remove(id: string) {
    setSelected((prev) => prev.filter((x) => x !== id));
  }

  async function handleAddInstaller() {
    if (!newName.trim() || !newEmail.trim()) {
      setAddError("Name and email are both required.");
      return;
    }
    setAdding(true);
    setAddError("");
    const fd = new FormData();
    fd.set("name", newName.trim());
    fd.set("email", newEmail.trim());
    fd.set("role", "SENIOR_INSTALLER");
    const result = await createUser({}, fd);
    setAdding(false);
    if (result.error) {
      setAddError(result.error);
      return;
    }
    if (result.createdUserId) {
      setLocalStaff((prev) => [...prev, { id: result.createdUserId!, name: newName.trim() }]);
      setSelected((prev) => [...prev, result.createdUserId!]);
    }
    setNewName("");
    setNewEmail("");
    setAddingOpen(false);
    setOpen(false);
  }

  return (
    <div style={{ position: "relative", minWidth: 260 }}>
      {selected.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      {chosen.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
          {chosen.map((s) => (
            <span key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#e6f4fd", border: "1px solid #b9dff5", color: "#0b2a4a", borderRadius: 999, padding: "2px 4px 2px 10px", fontSize: 13, fontWeight: 600 }}>
              {s.name}
              <button type="button" onClick={() => remove(s.id)} aria-label={`Remove ${s.name}`} style={{ border: "none", background: "#fff", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", lineHeight: 1 }}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        value={search}
        placeholder={chosen.length ? "Add another person…" : "Search staff…"}
        autoComplete="off"
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (!addingOpen) setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault(); // don't submit the booking form while picking
            if (matches[0]) add(matches[0].id);
          }
        }}
        style={{ width: "100%" }}
      />

      {open && (
        <div
          onMouseDown={(e) => {
            if (!(e.target instanceof HTMLInputElement)) e.preventDefault(); // keep focus while clicking a name; let the add-installer boxes take focus
          }}
          style={{ position: "absolute", zIndex: 20, top: "100%", left: 0, right: 0, marginTop: 4, background: "#fff", border: "1px solid #d1d5db", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.12)", maxHeight: 300, overflowY: "auto" }}
        >
          {matches.map((s) => (
            <button key={s.id} type="button" onClick={() => add(s.id)} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "transparent", cursor: "pointer", fontWeight: 600 }}>
              {s.name}
            </button>
          ))}
          {matches.length === 0 && <div className="hint" style={{ padding: "8px 12px" }}>{term ? "No one matches." : "Everyone is already added."}</div>}

          <div style={{ borderTop: "1px solid #e5e7eb", padding: 8, display: allowAdd ? "block" : "none" }}>
            {!addingOpen ? (
              <button type="button" className="btn light" onClick={() => setAddingOpen(true)}>
                + Add Installer
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <input placeholder="Full name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <input placeholder="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                {addError && <div style={{ color: "#b91c1c", fontSize: 12 }}>{addError}</div>}
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" className="btn primary" disabled={adding} onClick={handleAddInstaller}>
                    {adding ? "Adding…" : "Add"}
                  </button>
                  <button
                    type="button"
                    className="btn light"
                    onClick={() => {
                      setAddingOpen(false);
                      setOpen(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
