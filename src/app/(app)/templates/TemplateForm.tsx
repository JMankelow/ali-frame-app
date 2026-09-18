"use client";

import { useActionState } from "react";
import { createEmailTemplate, updateEmailTemplate, type TemplateFormState } from "./actions";

const initialState: TemplateFormState = {};

const PLACEHOLDER_HINT =
  "Available placeholders: {{clientName}}, {{jobNumber}}, {{address}}, {{quoteNumber}}, {{senderName}} — filled in when sending, once send-from-record is built.";

export function TemplateForm({
  existing,
}: {
  existing?: { id: string; name: string; subject: string; body: string };
}) {
  const action = existing ? updateEmailTemplate.bind(null, existing.id) : createEmailTemplate;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="label">{existing ? "Edit Template" : "New Template"}</div>
      <form action={formAction} style={{ marginTop: 10 }}>
        <div className="form">
          <div>
            <label>Name</label>
            <input name="name" defaultValue={existing?.name} required />
          </div>
          <div>
            <label>Subject</label>
            <input name="subject" defaultValue={existing?.subject} required />
          </div>
          <div className="full">
            <label>Body</label>
            <textarea name="body" rows={6} defaultValue={existing?.body} required />
          </div>
        </div>
        <div className="hint" style={{ marginTop: 6 }}>{PLACEHOLDER_HINT}</div>
        {state.error && <div className="authError">{state.error}</div>}
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? "Saving…" : existing ? "Save Changes" : "Add Template"}
          </button>
        </div>
      </form>
    </div>
  );
}
