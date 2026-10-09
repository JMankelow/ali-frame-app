// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import Link from "next/link";
import { useState } from "react";

export function WarrantyForm({ jobNumber, quoteNumber, customerName, customerAddress, today }: { jobNumber: string; quoteNumber: string; customerName: string; customerAddress: string; today: string }) {
  const [name, setName] = useState(customerName);
  const [address, setAddress] = useState(customerAddress);
  const [project, setProject] = useState("");
  const [date, setDate] = useState(today);
  const [quote, setQuote] = useState(quoteNumber);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ filed: boolean } | null>(null);

  async function create() {
    setError("");
    setDone(null);
    setBusy(true);
    try {
      const res = await fetch(`/jobs/${jobNumber}/warranty/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName: name, customerAddress: address, projectAddress: project, date, quoteNumber: quote }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Couldn't create the warranty.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${jobNumber}-AliFrame_Warranty.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setDone({ filed: res.headers.get("X-Filed-On-Job") === "yes" });
    } catch {
      setError("Couldn't create the warranty — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="form">
        <div>
          <label>Job number (printed on the certificate)</label>
          <input value={jobNumber} readOnly />
        </div>
        <div>
          <label>Quote number (kept on record — not printed)</label>
          <input value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="e.g. 7851" />
        </div>
        <div className="full">
          <label>Customer name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="full">
          <label>Customer address *</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="full">
          <label>Address of project (only if different from the customer address)</label>
          <input value={project} onChange={(e) => setProject(e.target.value)} placeholder="Leave blank if it's the same" />
        </div>
        <div>
          <label>Warranty date *</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="hint">Prints as {date ? `${date.slice(8, 10)}.${date.slice(5, 7)}.${date.slice(0, 4)}` : "DD.MM.YYYY"}</div>
        </div>
      </div>
      {error && <div className="authError" style={{ marginTop: 12 }}>{error}</div>}
      {done && (
        <div className="card" style={{ marginTop: 12, borderLeft: "6px solid #1f8a4c" }}>
          <div className="status green" style={{ display: "inline-block" }}>Created</div>
          <div style={{ marginTop: 6, fontWeight: 600 }}>{jobNumber}-AliFrame_Warranty.pdf has been downloaded.</div>
          <div className="hint">
            {done.filed ? "A copy is also saved on the job's Files tab." : "A copy couldn't be saved on the job just now (file storage) — keep the downloaded one."}
          </div>
        </div>
      )}
      <div className="actions" style={{ marginTop: 14 }}>
        <button type="button" className="btn primary" disabled={busy || !name.trim() || !address.trim() || !date} onClick={create}>
          {busy ? "Creating…" : "Create warranty PDF"}
        </button>
        <Link href={`/jobs/${jobNumber}`} className="btn light">Back to the job</Link>
      </div>
    </div>
  );
}
