"use client";

import { useActionState, useMemo, useState } from "react";
import { sendTemplatedEmail, type SendTemplateState } from "../actions";

export interface TemplateOption {
  id: string;
  name: string;
  subject: string;
  body: string;
}
export interface SupplierContactOption {
  name: string;
  email: string;
}
export interface JobFileOption {
  id: string;
  fileName: string;
  fileType: string;
}

const initialState: SendTemplateState = {};

// Templates addressed to the supplier; everything else goes to the client.
const SUPPLIER_TEMPLATES = new Set(["Please Quote — Supplier", "Quote Acceptance"]);
// Jo's preferred contact per supplier, used when a supplier has several contacts.
const PREFERRED_CONTACT: Record<string, string> = { "vision windows": "sales", "nz windows": "paul", "altherm west": "troy", counties: "maree" };

function fillPlaceholders(text: string, values: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

function preferredContact(supplier: string, contacts: SupplierContactOption[]): SupplierContactOption | null {
  if (contacts.length === 0) return null;
  const hint = PREFERRED_CONTACT[supplier.trim().toLowerCase()];
  return (hint && contacts.find((c) => c.name.toLowerCase().includes(hint))) || contacts[0];
}

export function SendTemplateEmailForm({
  jobNumber,
  clientName,
  address,
  clientEmail,
  senderName,
  templates,
  supplierName,
  supplierContacts,
  jobFiles,
}: {
  jobNumber: string;
  clientName: string;
  address: string;
  clientEmail: string;
  senderName: string;
  templates: TemplateOption[];
  supplierName: string;
  supplierContacts: SupplierContactOption[];
  jobFiles: JobFileOption[];
}) {
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipient, setRecipient] = useState("");
  const [audience, setAudience] = useState<"client" | "supplier" | "">("");
  const [attached, setAttached] = useState<string[]>([]);
  const [showAttach, setShowAttach] = useState(false);
  const [state, formAction, pending] = useActionState(sendTemplatedEmail, initialState);

  const values = useMemo(
    () => ({ "Client Name": clientName, Address: address, "Job Number": jobNumber }),
    [clientName, address, jobNumber]
  );

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    const t = templates.find((t) => t.id === id);
    if (!t) {
      setSubject("");
      setBody("");
      setRecipient("");
      setAudience("");
      setAttached([]);
      return;
    }
    setSubject(fillPlaceholders(t.subject, values));
    const filled = fillPlaceholders(t.body, values);
    // Sign off as whoever is logged in, unless the template already ends with a named sign-off.
    setBody(/regards|sales team|operations manager/i.test(filled) ? filled : `${filled}\n\nKind regards,\n${senderName}`);

    // "To" fills itself in: the client for client templates, the job's supplier contact for supplier ones.
    const toSupplier = SUPPLIER_TEMPLATES.has(t.name);
    setAudience(toSupplier ? "supplier" : "client");
    setRecipient(toSupplier ? (preferredContact(supplierName, supplierContacts)?.email ?? "") : clientEmail);

    // If the email says something is attached, tick the most likely file (the latest "final" one).
    if (/attached/i.test(t.body)) {
      const final = jobFiles.find((f) => /final/i.test(f.fileName) || /final/i.test(f.fileType));
      setAttached(final ? [final.id] : []);
    } else {
      setAttached([]);
    }
  }

  const missingRecipient = templateId && !recipient;
  const needsAttachment = /attached/i.test(body) && attached.length === 0;

  return (
    <div className="card">
      <div className="label">Send Templated Email</div>
      <div className="hint" style={{ marginTop: 4, marginBottom: 10 }}>
        Pick a template — the recipient, subject and wording fill in automatically. Check any bracketed [placeholders], tick anything to attach, then send. Replies come back to you.
      </div>

      <form action={formAction}>
        <input type="hidden" name="jobNumber" value={jobNumber} />
        {attached.map((id) => (
          <input key={id} type="hidden" name="attachmentIds" value={id} />
        ))}
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
            <label>
              To{audience ? ` — ${audience === "supplier" ? `supplier${supplierName ? ` (${supplierName})` : ""}` : "client"}` : ""}
            </label>
            <input name="to" type="email" list="supplier-contact-emails" value={recipient} onChange={(e) => setRecipient(e.target.value)} required />
            <datalist id="supplier-contact-emails">
              {supplierContacts.map((c) => (
                <option key={c.email} value={c.email}>{c.name}</option>
              ))}
            </datalist>
            {missingRecipient && (
              <div className="hint" style={{ color: "#b91c1c", marginTop: 4 }}>
                {audience === "supplier"
                  ? "No supplier contact found for this job — set the job's supplier in Job Details, or type an address."
                  : "This job has no client email on file — add it in Job Details (Edit), or type an address."}
              </div>
            )}
          </div>
          <div className="full">
            <label>Subject</label>
            <input name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>
          <div className="full">
            <label>Body</label>
            <textarea name="body" rows={10} value={body} onChange={(e) => setBody(e.target.value)} required />
          </div>
          <div className="full">
            {!(showAttach || /attached/i.test(body) || attached.length > 0) ? (
              <button type="button" className="btn light" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setShowAttach(true)}>+ Attach files</button>
            ) : (
              <>
            <label>Attachments (files on this job)</label>
            {jobFiles.length === 0 ? (
              <div className="hint">No files on this job yet — upload on the Files tab first.</div>
            ) : (
              <div style={{ display: "grid", gap: 4, maxHeight: 180, overflowY: "auto" }}>
                {jobFiles.map((f) => (
                  <label key={f.id} style={{ fontWeight: 400, display: "flex", gap: 8, alignItems: "center", textTransform: "none", letterSpacing: 0, fontSize: 14, color: "#111827" }}>
                    <input
                      type="checkbox"
                      checked={attached.includes(f.id)}
                      onChange={(e) => setAttached((cur) => (e.target.checked ? [...cur, f.id] : cur.filter((x) => x !== f.id)))}
                    />
                    {f.fileName} <span className="hint">({f.fileType})</span>
                  </label>
                ))}
              </div>
            )}
            {needsAttachment && (
              <div className="hint" style={{ color: "#b45309", marginTop: 4 }}>
                This email says something is attached, but nothing is ticked.
              </div>
            )}
              </>
            )}
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
