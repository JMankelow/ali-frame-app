// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useActionState, useRef, useState } from "react";
import { requestUpload, confirmUpload } from "../../../files/actions";
import { addQaPhotos, removeQaPhoto, saveQaReport, type QaFormState } from "../actions";

interface Photo {
  id: string;
  url: string;
  name: string;
  label: string;
  description: string;
}
interface Initial {
  title: string;
  description: string;
  reportDate: string;
  photos: Photo[];
}

const initialState: QaFormState = {};

export function QaEditor({ reportId, jobNumber, initial, final, canEdit }: { reportId: string; jobNumber: string; initial: Initial; final: boolean; canEdit: boolean }) {
  const [d, setD] = useState(initial);
  const [state, formAction, pending] = useActionState(saveQaReport.bind(null, reportId), initialState);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const readOnly = final || !canEdit;

  const payload = JSON.stringify({ title: d.title, description: d.description, reportDate: d.reportDate, photos: d.photos.map((p) => ({ id: p.id, label: p.label, description: p.description })) });
  const setPhoto = (i: number, k: "label" | "description", v: string) => setD((p) => ({ ...p, photos: p.photos.map((x, n) => (n === i ? { ...x, [k]: v } : x)) }));
  const unlabelled = d.photos.filter((p) => !p.label.trim()).length;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError("");
    try {
      // Keep what's been typed so far: save a draft before the page reloads with the new photos.
      const fd = new FormData();
      fd.set("payload", payload);
      await saveQaReport(reportId, {}, fd);

      const keys: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(`Uploading ${i + 1} of ${files.length}: ${file.name}`);
        const { error: reqError, storageKey, uploadUrl } = await requestUpload(jobNumber, file.name, file.type, file.size);
        if (reqError || !storageKey || !uploadUrl) {
          setError(reqError ?? `Could not upload ${file.name}.`);
          continue;
        }
        const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
        if (!put.ok) {
          setError(`Upload failed for ${file.name}.`);
          continue;
        }
        const c = await confirmUpload({ jobNumber, storageKey, fileName: file.name, fileType: "Photos", mimeType: file.type || "application/octet-stream", sizeBytes: file.size });
        if (c.error) {
          setError(c.error);
          continue;
        }
        keys.push(storageKey);
      }
      if (keys.length) {
        const r = await addQaPhotos(reportId, keys);
        if (r.error) setError(r.error);
      }
    } catch {
      setError("Something went wrong adding the photos.");
    }
    setProgress("");
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    window.location.reload();
  }

  return (
    <div>
      <div className="card">
        <div className="form">
          <div className="full">
            <label>Report title</label>
            <input value={d.title} disabled={readOnly} onChange={(e) => setD((p) => ({ ...p, title: e.target.value }))} />
          </div>
          <div>
            <label>Date</label>
            <input type="date" value={d.reportDate} disabled={readOnly} onChange={(e) => setD((p) => ({ ...p, reportDate: e.target.value }))} />
          </div>
          <div className="full">
            <label>Overall description (what was inspected, general findings)</label>
            <textarea rows={4} value={d.description} disabled={readOnly} onChange={(e) => setD((p) => ({ ...p, description: e.target.value }))} />
          </div>
        </div>
      </div>

      {!readOnly && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="label">Add photos</div>
          <div className="hint" style={{ margin: "4px 0 8px" }}>Take or choose several photos at once. Every photo must be labelled, with a description underneath.</div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png" multiple capture="environment" disabled={busy} onChange={(e) => handleFiles(e.target.files)} />
          {busy && <div className="hint" style={{ marginTop: 8 }}>{progress || "Saving…"}</div>}
          {error && <div className="authError" style={{ marginTop: 8 }}>{error}</div>}
        </div>
      )}

      {d.photos.length === 0 && <div className="card hint" style={{ marginTop: 12 }}>No photos yet — add some above.</div>}

      {d.photos.map((p, i) => (
        <div key={p.id} className="card" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: "0 0 260px" }}>
              {p.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.url} alt={p.label || p.name} style={{ width: "100%", borderRadius: 8, display: "block" }} />
              ) : (
                <div className="hint">Photo preview unavailable ({p.name})</div>
              )}
            </div>
            <div style={{ flex: "1 1 280px", minWidth: 240 }}>
              <label>Photo {i + 1} label (required)</label>
              <input value={p.label} disabled={readOnly} onChange={(e) => setPhoto(i, "label", e.target.value)} placeholder="e.g. Lounge slider — head flashing" style={!p.label.trim() && !readOnly ? { borderColor: "#dc2626" } : undefined} />
              <label style={{ marginTop: 8, display: "block" }}>Description</label>
              <textarea rows={4} value={p.description} disabled={readOnly} onChange={(e) => setPhoto(i, "description", e.target.value)} placeholder="What the photo shows and any notes…" />
              {!readOnly && (
                <form action={removeQaPhoto} style={{ marginTop: 6 }}>
                  <input type="hidden" name="photoId" value={p.id} />
                  <button type="submit" className="btn light">Remove from report</button>
                </form>
              )}
            </div>
          </div>
        </div>
      ))}

      <form action={formAction} className="card" style={{ marginTop: 12 }}>
        <input type="hidden" name="payload" value={payload} />
        {state.error && <div className="authError">{state.error}</div>}
        {state.saved && <div className="status green" style={{ display: "inline-block", marginBottom: 8 }}>{state.saved}</div>}
        {!readOnly && unlabelled > 0 && <div className="hint" style={{ marginBottom: 8 }}>{unlabelled} photo{unlabelled === 1 ? "" : "s"} still need a label.</div>}
        <div className="actions">
          {!readOnly && <button type="submit" className="btn primary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>}
          {!readOnly && <button type="submit" name="intent" value="final" className="btn light" disabled={pending}>Finalise report</button>}
          {d.photos.length > 0 && (
            <a className="btn light" href={`/health-safety/qa/${reportId}/pdf`} target="_blank" rel="noopener noreferrer">Download PDF</a>
          )}
        </div>
        <div className="hint" style={{ marginTop: 6 }}>Save before downloading — the PDF is built from what&apos;s saved. A finalised report can&apos;t be edited.</div>
      </form>
    </div>
  );
}
