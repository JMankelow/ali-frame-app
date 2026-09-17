"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { getFileDownloadUrl, deleteFile } from "./actions";

export function FileRow({
  id,
  name,
  jobNumber,
  fileType,
  uploadedByName,
  date,
}: {
  id: string;
  name: string;
  jobNumber: string;
  fileType: string;
  uploadedByName: string;
  date: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleDownload() {
    setError("");
    startTransition(async () => {
      const { url, error } = await getFileDownloadUrl(id);
      if (error || !url) {
        setError(error ?? "Could not get a download link.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteFile(id);
    });
  }

  return (
    <tr>
      <td>{name}</td>
      <td>
        <Link href={`/jobs/${jobNumber}`} style={{ color: "var(--blueDark)", fontWeight: 800, textDecoration: "none" }}>
          {jobNumber}
        </Link>
      </td>
      <td>{fileType}</td>
      <td>{uploadedByName}</td>
      <td>{date}</td>
      <td>
        <div className="actions">
          <button className="btn light" onClick={handleDownload} disabled={pending}>
            Download
          </button>
          <button className="btn light" onClick={handleDelete} disabled={pending}>
            Delete
          </button>
        </div>
        {error && <div className="hint" style={{ color: "#b91c1c" }}>{error}</div>}
      </td>
    </tr>
  );
}
