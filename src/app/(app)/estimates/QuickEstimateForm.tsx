"use client";

import { useActionState, useState, useTransition } from "react";
import { createQuickEstimate, getEstimatePdfUrl, type QuickEstimateState } from "./quickActions";

const CATEGORIES = [
  "Bifold Doors",
  "Ranch Sliders",
  "Sliding Windows",
  "Garage Doors",
  "Awning Windows",
  "French Doors",
  "Repair/Hardware",
  "Entrance Doors",
  "Bifold Windows",
  "Other",
];

const initialState: QuickEstimateState = {};

export function QuickEstimateForm() {
  const [state, formAction, pending] = useActionState(createQuickEstimate, initialState);
  const [downloading, startTransition] = useTransition();
  const [downloadError, setDownloadError] = useState("");

  function handleDownload() {
    if (!state.estimateId) return;
    setDownloadError("");
    startTransition(async () => {
      const { url, error } = await getEstimatePdfUrl(state.estimateId!);
      if (error || !url) {
        setDownloadError(error ?? "Could not get the PDF.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="label">Create Estimate</div>
      <div className="hint" style={{ marginBottom: 10 }}>
        Enter what you know — leave Total blank to use the closest matching past estimate as a starting price. Creates
        a one-page branded PDF with a single total, no line-item breakdown.
      </div>
      <form action={formAction}>
        <div className="form">
          <div>
            <label>Client Name</label>
            <input name="clientName" required />
          </div>
          <div>
            <label>Client Email</label>
            <input name="email" type="email" />
          </div>
          <div>
            <label>Phone</label>
            <input name="phone" />
          </div>
          <div>
            <label>Site Address</label>
            <input name="address" />
          </div>
          <div>
            <label>Category</label>
            <select name="category" defaultValue="" required>
              <option value="" disabled>
                Select…
              </option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Width (mm)</label>
            <input name="widthMM" type="number" />
          </div>
          <div>
            <label>Height (mm)</label>
            <input name="heightMM" type="number" />
          </div>
          <div>
            <label>Total (optional — blank = auto-suggest)</label>
            <input name="total" placeholder="e.g. $8,400 + GST" />
          </div>
          <div className="full">
            <label>Scope of Work (one line per item)</label>
            <textarea name="scope" rows={3} required placeholder="e.g. Replace ranch slider with double-glazed bi-fold door" />
          </div>
        </div>
        {state.error && <div className="authError">{state.error}</div>}
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? "Creating…" : "Create Estimate + PDF"}
          </button>
          {state.estimateId && (
            <button type="button" className="btn light" onClick={handleDownload} disabled={downloading}>
              {downloading ? "Opening…" : "Download PDF"}
            </button>
          )}
        </div>
        {downloadError && <div className="hint" style={{ color: "#b91c1c", marginTop: 6 }}>{downloadError}</div>}
      </form>
    </div>
  );
}
