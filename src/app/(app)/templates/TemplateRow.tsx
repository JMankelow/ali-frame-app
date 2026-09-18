"use client";

import { useState, useTransition } from "react";
import { deleteEmailTemplate } from "./actions";
import { TemplateForm } from "./TemplateForm";

export function TemplateRow({ id, name, subject, body }: { id: string; name: string; subject: string; body: string }) {
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete the "${name}" template?`)) return;
    startTransition(() => deleteEmailTemplate(id));
  }

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="topbar" style={{ marginBottom: editing ? 8 : 0 }}>
        <div>
          <div style={{ fontWeight: 800 }}>{name}</div>
          <div className="hint">{subject}</div>
        </div>
        <div className="actions">
          <button className="btn light" onClick={() => setEditing((v) => !v)}>
            {editing ? "Close" : "Edit"}
          </button>
          <button className="btn light" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>
      {!editing && <div className="hint" style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{body}</div>}
      {editing && <TemplateForm existing={{ id, name, subject, body }} />}
    </div>
  );
}
