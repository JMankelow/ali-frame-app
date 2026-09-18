"use client";

import { useState, useTransition } from "react";
import { getMarketingDownloadUrl, deleteMarketingAsset } from "./actions";

export function MarketingAssetRow({
  id,
  title,
  description,
  linkUrl,
  fileName,
  uploadedByName,
  date,
}: {
  id: string;
  title: string;
  description: string | null;
  linkUrl: string | null;
  fileName: string | null;
  uploadedByName: string;
  date: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleDownload() {
    setError("");
    startTransition(async () => {
      const { url, error } = await getMarketingDownloadUrl(id);
      if (error || !url) {
        setError(error ?? "Could not get a download link.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  function handleDelete() {
    if (!confirm(`Remove "${title}"?`)) return;
    startTransition(() => deleteMarketingAsset(id));
  }

  return (
    <tr>
      <td>
        <div style={{ fontWeight: 800 }}>{title}</div>
        {description && <div className="hint">{description}</div>}
      </td>
      <td>{uploadedByName}</td>
      <td>{date}</td>
      <td>
        <div className="actions">
          {fileName && (
            <button className="btn light" onClick={handleDownload} disabled={pending}>
              Download
            </button>
          )}
          {linkUrl && (
            <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="btn light">
              Open Link ↗
            </a>
          )}
          <button className="btn light" onClick={handleDelete} disabled={pending}>
            Remove
          </button>
        </div>
        {error && <div className="hint" style={{ color: "#b91c1c" }}>{error}</div>}
      </td>
    </tr>
  );
}
