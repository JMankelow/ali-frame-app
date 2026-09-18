"use client";

import { useRef, useState } from "react";
import { requestMarketingUpload, createMarketingAsset } from "./actions";
import type { MarketingCategory } from "./categories";

export function MarketingAssetForm({ category }: { category: MarketingCategory }) {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setStatus("");

    const form = e.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    const description = String(data.get("description") ?? "");
    const linkUrl = String(data.get("linkUrl") ?? "").trim();
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (!title) return setError("Give it a title.");
    if (!file && !linkUrl) return setError("Attach a file or a link.");

    setBusy(true);
    try {
      let storageKey: string | undefined;
      let fileName: string | undefined;

      if (file) {
        setStatus("Requesting upload link...");
        const { error: reqError, storageKey: key, uploadUrl } = await requestMarketingUpload(category, file.name, file.type, file.size);
        if (reqError || !key || !uploadUrl) {
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
        storageKey = key;
        fileName = file.name;
      }

      setStatus("Saving...");
      const { error: saveError } = await createMarketingAsset({ category, title, description, linkUrl, storageKey, fileName });
      if (saveError) {
        setError(saveError);
        return;
      }

      setStatus("Added.");
      formRef.current?.reset();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="label">Add</div>
      <form ref={formRef} onSubmit={handleSubmit}>
        <div className="form">
          <div>
            <label>Title</label>
            <input name="title" required />
          </div>
          <div>
            <label>Link (optional)</label>
            <input name="linkUrl" placeholder="https://..." />
          </div>
          <div className="full">
            <label>File (optional)</label>
            <input type="file" name="file" />
          </div>
          <div className="full">
            <label>Notes (optional)</label>
            <textarea name="description" rows={2} />
          </div>
        </div>
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? "Saving..." : "Add"}
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
