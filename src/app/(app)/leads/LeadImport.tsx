// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useActionState, useState, useTransition } from "react";
import { JOB_LEAD_SOURCES } from "@/lib/jobStatus";
import { importLeads, parseLeadUpload, type LeadUploadState } from "./actions";

const initial: LeadUploadState = {};

/** Upload a spreadsheet (.csv/.xlsx) or a saved email (.eml) → review the leads it finds → import them. */
export function LeadImport({ staff }: { staff: { id: string; name: string }[] }) {
  const [state, formAction, parsing] = useActionState(parseLeadUpload, initial);
  const [edits, setEdits] = useState<{ key: string; rows: { title: string; source: string; description: string; on: boolean }[] } | null>(null);
  const [assignee, setAssignee] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [importing, startImport] = useTransition();

  // Load the preview into editable rows whenever a new file is read.
  const key = state.rows ? `${state.fileName}:${state.rows.length}:${state.rows[0]?.title}` : "";
  if (state.rows && edits?.key !== key) {
    setEdits({ key, rows: state.rows.map((r) => ({ title: r.title, source: r.source, description: r.description, on: !r.duplicate })) });
    setResult("");
    setError("");
  }
  const rows = edits?.rows ?? [];
  const patch = (i: number, p: Partial<(typeof rows)[number]>) =>
    setEdits((e) => (e ? { ...e, rows: e.rows.map((r, j) => (j === i ? { ...r, ...p } : r)) } : e));

  function doImport() {
    setError("");
    startImport(async () => {
      const res = await importLeads(rows.filter((r) => r.on).map(({ title, source, description }) => ({ title, source, description })), assignee);
      if (res.error) setError(res.error);
      else {
        setResult(`Imported ${res.created} lead${res.created === 1 ? "" : "s"}.`);
        setEdits(null);
      }
    });
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="label">Import leads from a file</div>
      <div className="hint" style={{ marginTop: 4 }}>
        Upload a spreadsheet (.csv or .xlsx — headings like Name, Email, Phone, Address, Source, Message) or an enquiry email saved from the sales inbox (.eml).
        You&apos;ll get to check everything before it&apos;s added.
      </div>
      <form action={formAction} className="actions" style={{ marginTop: 10 }}>
        <input type="file" name="file" accept=".csv,.xlsx,.eml" required />
        <button type="submit" className="btn light" disabled={parsing}>{parsing ? "Reading…" : "Read file"}</button>
      </form>
      {state.error && <div className="authError" style={{ marginTop: 10 }}>{state.error}</div>}
      {result && <div className="status green" style={{ marginTop: 10, display: "inline-block" }}>{result}</div>}

      {rows.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="label">{rows.length} lead{rows.length === 1 ? "" : "s"} found in {state.fileName} — edit anything that&apos;s wrong, untick any you don&apos;t want</div>
          <table style={{ marginTop: 8 }}>
            <thead>
              <tr><th></th><th>Title</th><th>Source</th><th>Details</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td><input type="checkbox" checked={r.on} onChange={(e) => patch(i, { on: e.target.checked })} /></td>
                  <td><input value={r.title} onChange={(e) => patch(i, { title: e.target.value })} style={{ width: "100%" }} /></td>
                  <td>
                    <select value={r.source} onChange={(e) => patch(i, { source: e.target.value })}>
                      <option value="">—</option>
                      {r.source && !JOB_LEAD_SOURCES.includes(r.source) && <option>{r.source}</option>}
                      {JOB_LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td><textarea value={r.description} onChange={(e) => patch(i, { description: e.target.value })} rows={3} style={{ width: "100%" }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {state.rows?.some((r) => r.duplicate) && <div className="hint" style={{ marginTop: 6 }}>Leads with the same title as one already in the list start unticked.</div>}
          <div className="actions" style={{ marginTop: 10 }}>
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option value="">Unassigned</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button type="button" className="btn primary" disabled={importing || !rows.some((r) => r.on)} onClick={doImport}>
              {importing ? "Importing…" : `Import ${rows.filter((r) => r.on).length} lead(s)`}
            </button>
          </div>
          {error && <div className="authError" style={{ marginTop: 10 }}>{error}</div>}
        </div>
      )}
    </div>
  );
}
