// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useRef, useState } from "react";
import { requestUpload, confirmUpload } from "../../files/actions";

/** Office: add a downloadable schedule (PDF or image) to the job — the team can then download it from the Schedule tab. */
export function ScheduleUpload({ jobNumber }: { jobNumber: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  async function handle(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    let saved = 0;
    for (const file of Array.from(files)) {
      try {
        const r = await requestUpload(jobNumber, file.name, file.type, file.size);
        if (r.error || !r.storageKey || !r.uploadUrl) {
          setError(r.error ?? `Couldn't add ${file.name}.`);
          continue;
        }
        const put = await fetch(r.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
        if (!put.ok) {
          setError(`Upload failed for ${file.name}.`);
          continue;
        }
        const c = await confirmUpload({ jobNumber, storageKey: r.storageKey, fileName: file.name, fileType: "Supplier Schedule", mimeType: file.type || "application/octet-stream", sizeBytes: file.size });
        if (c.error) setError(c.error);
        else saved += 1;
      } catch {
        setError(`Something went wrong adding ${file.name}.`);
      }
    }
    setBusy(false);
    if (ref.current) ref.current.value = "";
    if (saved > 0) window.location.reload();
  }

  return (
    <div style={{ marginTop: 12 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 700 }}>Add a schedule (PDF or photo)</label>
      <input ref={ref} type="file" accept="application/pdf,image/*" multiple disabled={busy} onChange={(e) => handle(e.target.files)} />
      {busy && <div className="hint">Uploading…</div>}
      {error && <div className="authError" style={{ marginTop: 6 }}>{error}</div>}
    </div>
  );
}
