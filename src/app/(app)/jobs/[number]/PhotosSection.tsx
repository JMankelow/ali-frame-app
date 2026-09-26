"use client";

import { useRef, useState } from "react";
import { requestUpload, confirmUpload } from "../../files/actions";
import { FileRow } from "../../files/FileRow";

export interface PhotoRow {
  id: string;
  fileName: string;
  uploadedByName: string;
  date: string;
}

export function PhotosSection({
  jobNumber,
  photos,
  sharePointUrl,
}: {
  jobNumber: string;
  photos: PhotoRow[];
  sharePointUrl: string;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError("");

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress(`Uploading ${i + 1} of ${files.length}: ${file.name}`);
      try {
        const { error: reqError, storageKey, uploadUrl } = await requestUpload(jobNumber, file.name, file.type, file.size);
        if (reqError || !storageKey || !uploadUrl) {
          setError(reqError ?? `Could not upload ${file.name}.`);
          continue;
        }
        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!putRes.ok) {
          setError(`Upload failed for ${file.name}.`);
          continue;
        }
        await confirmUpload({
          jobNumber,
          storageKey,
          fileName: file.name,
          fileType: "Photos",
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        });
      } catch {
        setError(`Something went wrong uploading ${file.name}.`);
      }
    }

    setProgress("");
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    window.location.reload();
  }

  return (
    <div className="card">
      <div className="topbar" style={{ marginBottom: 8 }}>
        <div className="label">Photos</div>
        <a href={sharePointUrl} target="_blank" rel="noopener noreferrer" className="btn light">
          Open Client SharePoint Folder ↗
        </a>
      </div>
      <div className="hint" style={{ marginBottom: 10 }}>
        Take or choose multiple photos at once. Uploaded here for now — drag them into the SharePoint folder above to
        share with the client until automatic SharePoint delivery is set up (needs a Microsoft/Azure app registration
        from Jo before that part can be built).
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        disabled={busy}
        onChange={(e) => handleFiles(e.target.files)}
      />
      {busy && <div className="hint" style={{ marginTop: 8 }}>{progress}</div>}
      {error && <div className="hint" style={{ marginTop: 8, color: "#b91c1c" }}>{error}</div>}

      {photos.length === 0 ? (
        <div className="hint" style={{ marginTop: 12 }}>
          No photos uploaded for this job yet.
        </div>
      ) : (
        <table style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Uploaded By</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {photos.map((p) => (
              <FileRow key={p.id} id={p.id} name={p.fileName} jobNumber={jobNumber} fileType="Photos" uploadedByName={p.uploadedByName} date={p.date} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
