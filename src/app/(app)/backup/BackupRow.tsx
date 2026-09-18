"use client";

import { useState, useTransition } from "react";
import { getBackupUrl } from "./actions";

export function BackupRow({ backupKey, created, size }: { backupKey: string; created: string; size: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleDownload() {
    setError("");
    startTransition(async () => {
      const { url, error } = await getBackupUrl(backupKey);
      if (error || !url) {
        setError(error ?? "Could not get a download link.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <tr>
      <td>{backupKey.split("/").pop()}</td>
      <td>{created}</td>
      <td>{size}</td>
      <td>
        <button className="btn light" onClick={handleDownload} disabled={pending}>
          Download
        </button>
        {error && <div className="hint" style={{ color: "#b91c1c" }}>{error}</div>}
      </td>
    </tr>
  );
}
