"use client";

import { useRef, useState } from "react";
import { requestUpload, confirmUpload, FILE_TYPES } from "./actions";

export function UploadForm({ jobNumbers }: { jobNumbers: string[] }) {
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setStatus("");

    const form = e.currentTarget;
    const jobNumber = String(new FormData(form).get("jobNumber") ?? "");
    const fileType = String(new FormData(form).get("fileType") ?? "Other");
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (!jobNumber) return setError("Select a job.");
    if (!file) return setError("Choose a file.");

    setBusy(true);
    try {
      setStatus("Requesting upload link...");
      const { error: reqError, storageKey, uploadUrl } = await requestUpload(jobNumber, file.name, file.type, file.size);
      if (reqError || !storageKey || !uploadUrl) {
        setError(reqError ?? "Could not start the upload.");
        return;
      }

      setStatus("Uploading file...");
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putRes.ok) {
        setError("Upload to storage failed. Please try again.");
        return;
      }

      setStatus("Saving...");
      const { error: confirmError } = await confirmUpload({
        jobNumber,
        storageKey,
        fileName: file.name,
        fileType,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });
      if (confirmError) {
        setError(confirmError);
        return;
      }

      setStatus("Uploaded.");
      formRef.current?.reset();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="label">Upload a File</div>
      <form ref={formRef} onSubmit={handleSubmit}>
        <div className="form">
          <div>
            <label>Job</label>
            <select name="jobNumber" required>
              <option value="">Select a job...</option>
              {jobNumbers.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>File Type</label>
            <select name="fileType" defaultValue="Other">
              {FILE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="full">
            <label>File</label>
            <input type="file" name="file" required />
          </div>
        </div>
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? "Uploading..." : "Upload"}
          </button>
        </div>
        {status && !error && <div className="hint" style={{ marginTop: 8 }}>{status}</div>}
        {error && (
          <div className="hint" style={{ marginTop: 8, color: "#b91c1c" }}>
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
