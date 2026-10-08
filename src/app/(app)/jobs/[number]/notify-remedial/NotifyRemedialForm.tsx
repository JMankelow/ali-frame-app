// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { requestUpload, confirmUpload } from "../../../files/actions";
import { notifyRemedial } from "./actions";

export function NotifyRemedialForm({ jobNumber, today }: { jobNumber: string; today: string }) {
  const [date, setDate] = useState(today);
  const [what, setWhat] = useState("");
  const [required, setRequired] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ emailed: boolean; added: number; failed: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit() {
    setError("");
    if (!what.trim() || !required.trim()) return setError("Please say what happened and what's required.");
    setBusy(true);
    let added = 0;
    let failed = 0;
    // Photos go on the job's Photos tab; a photo that won't upload never stops the alert going out.
    for (const file of files) {
      try {
        const name = `Remedial ${date} — ${file.name}`;
        const r = await requestUpload(jobNumber, name, file.type, file.size);
        if (r.error || !r.storageKey || !r.uploadUrl) { failed++; continue; }
        const put = await fetch(r.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
        if (!put.ok) { failed++; continue; }
        const c = await confirmUpload({ jobNumber, storageKey: r.storageKey, fileName: name, fileType: "Photos", mimeType: file.type || "application/octet-stream", sizeBytes: file.size });
        if (c.error) failed++;
        else added++;
      } catch {
        failed++;
      }
    }
    const res = await notifyRemedial({ jobNumber, date, what, required, photosAdded: added, photosFailed: failed });
    setBusy(false);
    if (res.error) return setError(res.error);
    setDone({ emailed: !!res.emailed, added, failed });
  }

  if (done) {
    return (
      <div className="card" style={{ borderLeft: "6px solid #1f8a4c" }}>
        <div className="status green" style={{ display: "inline-block" }}>Sent</div>
        <div style={{ marginTop: 8, fontWeight: 800 }}>Tanya and Tristam have been alerted.</div>
        <div className="hint" style={{ marginTop: 4 }}>
          {done.emailed ? "They've been emailed and it's on their task lists." : "It's on their task lists (the email couldn't be sent — please also tell them directly)."}{" "}
          {done.added > 0 && `${done.added} photo${done.added === 1 ? "" : "s"} added to the job. `}
          {done.failed > 0 && `${done.failed} photo${done.failed === 1 ? "" : "s"} couldn't be uploaded — send them to the office.`}
        </div>
        <div className="actions" style={{ marginTop: 12 }}>
          <Link href={`/jobs/${jobNumber}`} className="btn primary">Back to the job</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ borderLeft: "6px solid #c62828" }}>
      <div className="form">
        <div>
          <label>Date it happened</label>
          <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="full">
          <label>What happened *</label>
          <textarea rows={4} value={what} onChange={(e) => setWhat(e.target.value)} placeholder="Describe the problem — what, where, which item…" />
        </div>
        <div className="full">
          <label>What&apos;s required to put it right *</label>
          <textarea rows={4} value={required} onChange={(e) => setRequired(e.target.value)} placeholder="Parts, glass, extra labour, a return visit…" />
        </div>
        <div className="full">
          <label>Photos</label>
          <input ref={fileRef} type="file" accept="image/*" multiple capture={undefined} onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
          <div className="hint">{files.length ? `${files.length} photo${files.length === 1 ? "" : "s"} chosen.` : "Take or choose photos of the problem."}</div>
        </div>
      </div>
      {error && <div className="authError" style={{ marginTop: 10 }}>{error}</div>}
      <div className="actions" style={{ marginTop: 12 }}>
        <button type="button" className="btn primary" disabled={busy} onClick={submit} style={{ background: "#c62828", borderColor: "#c62828", fontSize: 16, padding: "12px 22px" }}>
          {busy ? "Sending…" : "Alert Tanya & Tristam now"}
        </button>
        <Link href={`/jobs/${jobNumber}`} className="btn light">Cancel</Link>
      </div>
    </div>
  );
}
