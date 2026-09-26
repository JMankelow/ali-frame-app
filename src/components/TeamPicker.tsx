"use client";

import { useState } from "react";
import { createUser } from "@/app/(app)/users/actions";

export interface TeamPickerOption {
  id: string;
  name: string;
}

export function TeamPicker({
  name,
  staff,
  defaultSelectedIds = [],
}: {
  name: string;
  staff: TeamPickerOption[];
  defaultSelectedIds?: string[];
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

  const filtered = localStaff.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
  const selectedNames = localStaff.filter((s) => selected.includes(s.id)).map((s) => s.name);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
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
  }

  return (
    <div style={{ position: "relative" }}>
      {selected.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
      <button
        type="button"
        className="btn light"
        onClick={() => setOpen((o) => !o)}
        style={{ minWidth: 220, textAlign: "left" }}
      >
        {selectedNames.length === 0 ? "— Select team —" : selectedNames.join(", ")}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            zIndex: 20,
            top: "100%",
            left: 0,
            marginTop: 4,
            background: "#fff",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            padding: 10,
            width: 280,
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", marginBottom: 8 }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {filtered.map((s) => (
              <label key={s.id} style={{ fontWeight: 400, display: "flex", alignItems: "center", gap: 6, padding: "2px 0" }}>
                <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} />
                {s.name}
              </label>
            ))}
            {filtered.length === 0 && <div className="hint">No matches.</div>}
          </div>

          <div style={{ borderTop: "1px solid #e5e7eb", marginTop: 8, paddingTop: 8 }}>
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
                  <button type="button" className="btn light" onClick={() => setAddingOpen(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 8 }}>
            <button type="button" className="btn primary" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
