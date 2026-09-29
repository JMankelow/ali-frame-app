"use client";

import { useRef, useState } from "react";
import { requestEmployeeDocUpload, confirmEmployeeDocUpload, getEmployeeDocDownloadUrl, deleteEmployeeDoc } from "./actions";

const DOC_TYPES = ["Contract", "ID", "Certification", "Other"];

export interface EmployeeDocRow {
  id: string;
  fileName: string;
  docType: string;
  uploadedByName: string;
  date: string;
}

export function DocumentsTab({ userId, documents, canManage }: { userId: string; documents: EmployeeDocRow[]; canManage: boolean }) {
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError("");

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setStatus(`Uploading ${i + 1} of ${files.length}: ${file.name}`);
      try {
        const { error: reqError, storageKey, uploadUrl } = await requestEmployeeDocUpload(userId, file.name, file.type, file.size);
        if (reqError || !storageKey || !uploadUrl) {
          setError(reqError ?? `Could not upload ${file.name}.`);
          continue;
        }
        const putRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
        if (!putRes.ok) {
          setError(`Upload failed for ${file.name}.`);
          continue;
        }
        await confirmEmployeeDocUpload({
          userId,
          storageKey,
          fileName: file.name,
          docType,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        });
      } catch {
        setError(`Something went wrong uploading ${file.name}.`);
      }
    }

    setStatus("");
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    window.location.reload();
  }

  async function handleDownload(docId: string) {
    const { url, error } = await getEmployeeDocDownloadUrl(docId);
    if (url) window.open(url, "_blank");
    else if (error) setError(error);
  }

  return (
    <div className="card">
      <div className="label">Employee Documents</div>
      <div className="hint" style={{ marginTop: 4, marginBottom: 10 }}>
        Contracts, ID, certifications — stored securely, visible to admins.
      </div>

      {canManage && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <select value={docType} onChange={(e) => setDocType(e.target.value)}>
            {DOC_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <input ref={inputRef} type="file" multiple disabled={busy} onChange={(e) => handleFiles(e.target.files)} />
        </div>
      )}
      {busy && <div className="hint">{status}</div>}
      {error && <div className="hint" style={{ color: "#b91c1c" }}>{error}</div>}

      {documents.length === 0 ? (
        <div className="hint">No documents uploaded yet.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Uploaded By</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {documents.map((d) => (
              <tr key={d.id}>
                <td>{d.fileName}</td>
                <td>{d.docType}</td>
                <td>{d.uploadedByName}</td>
                <td>{d.date}</td>
                <td style={{ display: "flex", gap: 6 }}>
                  <button type="button" className="btn light" onClick={() => handleDownload(d.id)}>
                    Download
                  </button>
                  {canManage && (
                    <form action={deleteEmployeeDoc.bind(null, d.id)}>
                      <button type="submit" className="btn danger">
                        Delete
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
