"use client";

import { useActionState, useMemo, useState } from "react";
import { sendTemplatedEmail, type SendTemplateState } from "../actions";

export interface TemplateOption {
  id: string;
  name: string;
  subject: string;
  body: string;
}

const initialState: SendTemplateState = {};

function fillPlaceholders(text: string, values: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

export function SendTemplateEmailForm({
  jobNumber,
  clientName,
  address,
  clientEmail,
  senderName,
  templates,
}: {
  jobNumber: string;
  clientName: string;
  address: string;
  clientEmail: string;
  senderName: string;
  templates: TemplateOption[];
}) {
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipient, setRecipient] = useState(clientEmail);
  const [state, formAction, pending] = useActionState(sendTemplatedEmail, initialState);

  const values = useMemo(
    () => ({ "Client Name": clientName, Address: address, "Job Number": jobNumber }),
    [clientName, address, jobNumber]
  );

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    const t = templates.find((t) => t.id === id);
    if (t) {
      setSubject(fillPlaceholders(t.subject, values));
      const filled = fillPlaceholders(t.body, values);
      // Sign off as whoever is logged in, unless the template already ends with a named sign-off.
      setBody(/regards|sales team|operations manager/i.test(filled) ? filled : `${filled}

Kind regards,
${senderName}`);
    } else {
      setSubject("");
      setBody("");
    }
  }

  return (
    <div className="card">
      <div className="label">Send Templated Email</div>
      <div className="hint" style={{ marginTop: 4, marginBottom: 10 }}>
        Pick a template, check the filled-in details and any bracketed [placeholders], then send.
      </div>

      <form action={formAction}>
        <input type="hidden" name="jobNumber" value={jobNumber} />
        <div className="form">
          <div className="full">
            <label>Template</label>
            <select value={templateId} onChange={(e) => handleTemplateChange(e.target.value)}>
              <option value="">— Select a template —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="full">
            <label>To</label>
            <input name="to" type="email" value={recipient} onChange={(e) => setRecipient(e.target.value)} required />
          </div>
          <div className="full">
            <label>Subject</label>
            <input name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>
          <div className="full">
            <label>Body</label>
            <textarea name="body" rows={10} value={body} onChange={(e) => setBody(e.target.value)} required />
          </div>
        </div>
        {state.error && <div className="authError">{state.error}</div>}
        {state.success && <div className="hint">Sent.</div>}
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="submit" className="btn primary" disabled={pending || !templateId}>
            {pending ? "Sending…" : "Send Email"}
          </button>
        </div>
      </form>
    </div>
  );
}
