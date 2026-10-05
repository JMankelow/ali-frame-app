// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { JobPicker, type JobPickerOption } from "@/components/JobPicker";
import { emptyItem, labourLine, type CheckMeasureData, type CheckMeasureItem } from "@/lib/checkMeasure";
import { saveCheckMeasure, type CheckMeasureState } from "./actions";

const initialState: CheckMeasureState = {};

const ITEM_FIELDS: { key: keyof CheckMeasureItem; label: string; wide?: boolean; area?: boolean }[] = [
  { key: "location", label: "Item / location (e.g. Toilet)" },
  { key: "quantity", label: "Quantity" },
  { key: "level", label: "Level" },
  { key: "colour", label: "Colour / finish" },
  { key: "frameType", label: "Frame type", wide: true },
  { key: "trimSize", label: "Trim size" },
  { key: "reveal", label: "Reveal" },
  { key: "hardware", label: "Hardware & finish", wide: true },
  { key: "windLoading", label: "Wind loading" },
  { key: "glass", label: "Glass", wide: true },
  { key: "flashing", label: "Flashing / sill" },
  { key: "width", label: "Width (mm)" },
  { key: "height", label: "Height (mm)" },
  { key: "notes", label: "Notes (T.W.T, weight, infills, cladding, quote comments)", wide: true, area: true },
];

export function CheckMeasureForm({
  jobs, jobNumber, initial, supplierFiles, hasSaved,
}: { jobs: JobPickerOption[]; jobNumber: string; initial: CheckMeasureData; supplierFiles: { id: string; fileName: string }[]; hasSaved: boolean }) {
  const router = useRouter();
  const [d, setD] = useState<CheckMeasureData>(initial);
  const [state, formAction, pending] = useActionState(saveCheckMeasure.bind(null, jobNumber), initialState);
  const set = <K extends keyof CheckMeasureData>(k: K, v: CheckMeasureData[K]) => setD((p) => ({ ...p, [k]: v }));
  const setItem = (i: number, k: keyof CheckMeasureItem, v: string) => setD((p) => ({ ...p, items: p.items.map((it, n) => (n === i ? { ...it, [k]: v } : it)) }));
  const labour = labourLine(d.installAmount, d.teamSize);

  return (
    <div>
      <div className="card">
        <label>Job</label>
        <JobPicker jobs={jobs} value={jobNumber} onChange={(n) => router.push(n ? `/prepare-check-measure?job=${encodeURIComponent(n)}` : "/prepare-check-measure")} />
        <div className="hint" style={{ marginTop: 6 }}>
          Client, address, supplier and quote number come from the job. Add the install price, the supplied items and the notes — then save and open the PDF.
        </div>
      </div>

      {jobNumber && (
        <form action={formAction}>
          <input type="hidden" name="payload" value={JSON.stringify(d)} />

          <div className="card" style={{ marginTop: 12 }}>
            <div className="label">Page 1 — questionnaire</div>
            <div className="form" style={{ marginTop: 8 }}>
              <div><label>Client</label><input value={d.clientName} onChange={(e) => set("clientName", e.target.value)} /></div>
              <div><label>AliFrame quote no.</label><input value={d.quoteNumber} onChange={(e) => set("quoteNumber", e.target.value)} /></div>
              <div><label>Supplier (name only)</label><input value={d.supplierName} onChange={(e) => set("supplierName", e.target.value)} /></div>
              <div className="full"><label>Site address</label><input value={d.siteAddress} onChange={(e) => set("siteAddress", e.target.value)} /></div>
            </div>

            <div className="label" style={{ marginTop: 14 }}>Costings — internal / operations only</div>
            <div className="form" style={{ marginTop: 8 }}>
              <div><label>Install amount ($, excl. GST)</label><input value={d.installAmount} onChange={(e) => set("installAmount", e.target.value)} inputMode="decimal" /></div>
              <div><label>Onsite team size (ask Tanya)</label><input value={d.teamSize} onChange={(e) => set("teamSize", e.target.value)} inputMode="decimal" /></div>
              <div className="full hint">{labour ? `Labour Allowance will read: ${labour}` : "Enter the install amount and team size to build the Labour Allowance line."}</div>
              <div className="full">
                <label>Or: one labour line per crew/day combination (only if the install-price sheet states more than one) — overrides the above</label>
                <textarea rows={2} value={d.labourLines} onChange={(e) => set("labourLines", e.target.value)} placeholder="$1,500.00 — 20 hrs × 4 guys × 0.5 day" />
              </div>
              <div><label>Materials ($)</label><input value={d.materials} onChange={(e) => set("materials", e.target.value)} /></div>
              <div><label>Rubbish removal</label><input value={d.rubbish} onChange={(e) => set("rubbish", e.target.value)} /></div>
              <div><label>Scaffolding / access (leave blank unless asked)</label><input value={d.scaffolding} onChange={(e) => set("scaffolding", e.target.value)} /></div>
              <div><label>Other information</label><input value={d.otherInfo} onChange={(e) => set("otherInfo", e.target.value)} /></div>
            </div>

            <div className="label" style={{ marginTop: 14 }}>Quote summary &amp; installation notes / exclusions</div>
            <div className="form" style={{ marginTop: 8 }}>
              <div className="full">
                <label>Supplied items (one per line — quantities, joinery types, suite, colour, hardware, glass, liners, flashings…)</label>
                <textarea rows={6} value={d.summary} onChange={(e) => set("summary", e.target.value)} />
              </div>
              <div className="full">
                <label>Installation notes &amp; exclusions (one per line — removal/disposal, seals, architraves, scribers, painting…)</label>
                <textarea rows={4} value={d.notes} onChange={(e) => set("notes", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div className="label">Technical schedule — one card per joinery item</div>
            {d.items.map((it, i) => (
              <div key={i} style={{ border: "1px solid #00AEEF", borderRadius: 8, padding: 10, marginTop: 10 }}>
                <div className="topbar" style={{ marginBottom: 6 }}>
                  <b>Item {i + 1}{it.location ? `: ${it.location}` : ""}</b>
                  {d.items.length > 1 && (
                    <button type="button" className="btn light" onClick={() => setD((p) => ({ ...p, items: p.items.filter((_, n) => n !== i) }))}>Remove item</button>
                  )}
                </div>
                <div className="form">
                  {ITEM_FIELDS.map((f) => (
                    <div key={f.key} className={f.wide ? "full" : undefined}>
                      <label>{f.label}</label>
                      {f.area ? <textarea rows={2} value={it[f.key]} onChange={(e) => setItem(i, f.key, e.target.value)} /> : <input value={it[f.key]} onChange={(e) => setItem(i, f.key, e.target.value)} />}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="actions" style={{ marginTop: 10 }}>
              <button type="button" className="btn light" onClick={() => setD((p) => ({ ...p, items: [...p.items, emptyItem()] }))}>+ Add item</button>
            </div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div className="label">Supplier&apos;s own drawings</div>
            <div className="hint" style={{ marginTop: 4 }}>
              The supplier&apos;s elevation drawings are never redrawn — pick the supplier schedule (a PDF uploaded to the job as type &ldquo;Supplier Quote&rdquo;) and the pages that hold the item drawings; they&apos;re added after the AliFrame pages. For NZ Windows leave out their page 1 and any commercial pages.
            </div>
            <div className="form" style={{ marginTop: 8 }}>
              <div>
                <label>Supplier schedule PDF</label>
                <select value={d.supplierFileId} onChange={(e) => set("supplierFileId", e.target.value)}>
                  <option value="">— none —</option>
                  {supplierFiles.map((f) => <option key={f.id} value={f.id}>{f.fileName}</option>)}
                </select>
              </div>
              <div>
                <label>Pages to include (e.g. 2-5)</label>
                <input value={d.supplierPages} onChange={(e) => set("supplierPages", e.target.value)} placeholder="2-5" />
              </div>
            </div>
            {supplierFiles.length === 0 && <div className="hint">No supplier schedule PDF on this job yet — upload it on the job&apos;s Files tab as type &ldquo;Supplier Quote&rdquo;.</div>}
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            {state.error && <div className="authError">{state.error}</div>}
            {state.saved && <div className="status green" style={{ display: "inline-block", marginBottom: 8 }}>{state.saved}</div>}
            <div className="actions">
              <button type="submit" className="btn primary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
              <button type="submit" name="intent" value="file" className="btn light" disabled={pending}>Save &amp; add PDF to the job&apos;s files</button>
              {(hasSaved || state.saved) && (
                <a className="btn light" href={`/prepare-check-measure/pdf/${encodeURIComponent(jobNumber)}`} target="_blank" rel="noopener noreferrer">Open PDF</a>
              )}
            </div>
            <div className="hint" style={{ marginTop: 6 }}>Press Save first — the PDF is built from what&apos;s saved.</div>
          </div>
        </form>
      )}
    </div>
  );
}
