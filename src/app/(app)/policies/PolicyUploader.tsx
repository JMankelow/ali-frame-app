// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useRef, useState } from "react";
import { requestPolicyUpload, confirmPolicyUpload } from "./actions";

export function PolicyUploader({ categories }: { categories: string[] }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "Workplace Policies");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload() {
    const file = inputRef.current?.files?.[0];
    if (!file) return setError("Choose a PDF first.");
    if (!title.trim()) return setError("Enter a title.");
    setBusy(true);
    setError("");
    try {
      const req = await requestPolicyUpload(file.name, file.type, file.size);
      if (req.error || !req.storageKey || !req.uploadUrl) throw new Error(req.error ?? "Could not start the upload.");
      const put = await fetch(req.uploadUrl, { method: "PUT", headers: { "Content-Type": "application/pdf" }, body: file });
      if (!put.ok) throw new Error("Upload failed.");
      const done = await confirmPolicyUpload({ title, category, storageKey: req.storageKey, fileName: file.name, sizeBytes: file.size });
      if (done.error) throw new Error(done.error);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="label">Add a policy (super users)</div>
      <div className="form" style={{ marginTop: 10 }}>
        <div><label>Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div>
          <label>Category</label>
          <input list="policy-cats" value={category} onChange={(e) => setCategory(e.target.value)} />
          <datalist id="policy-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div className="full"><label>PDF</label><input ref={inputRef} type="file" accept="application/pdf" disabled={busy} /></div>
      </div>
      {error && <div className="authError">{error}</div>}
      <div className="actions" style={{ marginTop: 12 }}>
        <button type="button" className="btn primary" disabled={busy} onClick={upload}>{busy ? "Uploading…" : "Add Policy"}</button>
      </div>
    </div>
  );
}
