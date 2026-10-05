"use client";

import { useActionState, useEffect, useState } from "react";
import { generateQuote, getQuoteSources, sendQuoteEmail, type GenerateQuoteResult, type QuoteSources, type SendQuoteEmailResult } from "./actions";
import { JobPicker, type JobPickerOption } from "@/components/JobPicker";

const genInitial: GenerateQuoteResult = {};
const sendInitial: SendQuoteEmailResult = {};

export function SendQuoteForm({ jobs, suggestedTotals }: { jobs: JobPickerOption[]; suggestedTotals: Record<string, number> }) {
  const [jobNumber, setJobNumber] = useState("");
  const [genState, genAction, genPending] = useActionState(generateQuote, genInitial);
  const [sendState, sendAction, sendPending] = useActionState(sendQuoteEmail, sendInitial);
  const [quoteNumber, setQuoteNumber] = useState("");
  const [emailText, setEmailText] = useState("");
  const [sources, setSources] = useState<QuoteSources | null>(null);

  // Pull what the job already has: measure sheet, supplier schedule and the prepared price.
  useEffect(() => {
    let live = true;
    setSources(null);
    if (jobNumber) getQuoteSources(jobNumber).then((r) => live && setSources(r)).catch(() => live && setSources({ measureSheets: [], supplierSchedules: [], error: "Couldn't load this job's documents." }));
    return () => {
      live = false;
    };
  }, [jobNumber]);
  const DocList = ({ title, files, missing }: { title: string; files: QuoteSources["measureSheets"]; missing: string }) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontWeight: 700 }}>{title}</div>
      {files.length === 0 && <div className="hint">{missing}</div>}
      {files.map((f) => (
        <label key={f.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" name="partFileIds" value={f.id} defaultChecked={f.mergeable} disabled={!f.mergeable} />
          {f.fileName}
          {!f.mergeable && <span className="hint">(not a PDF/image — convert to PDF to include it)</span>}
        </label>
      ))}
    </div>
  );

  return (
    <div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="label">Quote Details</div>
        <form action={genAction} style={{ marginTop: 10 }}>
          <input type="hidden" name="jobNumber" value={jobNumber} />
          <div className="form">
            <div className="full">
              <label>Job</label>
              <JobPicker jobs={jobs} value={jobNumber} onChange={setJobNumber} />
            </div>
            <div>
              <label>Quote Number</label>
              <input name="quoteNumber" value={quoteNumber} onChange={(e) => setQuoteNumber(e.target.value)} required />
            </div>
            <div>
              <label>Approved Total ($)</label>
              <input key={jobNumber} name="total" type="number" step="0.01" required defaultValue={suggestedTotals[jobNumber] ?? ""} />
              {suggestedTotals[jobNumber] != null && (
                <div className="hint">Calculated from this job's Prepare Price figures (+2.5% overheads). Change it if the approved total differs.</div>
              )}
            </div>
            <div>
              <label>GST Basis</label>
              <select name="gstBasis" defaultValue="excluding">
                <option value="excluding">Total is + GST</option>
                <option value="including">Total includes GST</option>
              </select>
            </div>
            {jobNumber && (
              <div className="full" style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
                <div className="label">Quote pack — one PDF sent to the client</div>
                <div className="hint" style={{ marginBottom: 8 }}>
                  Order: the quote, then the measure sheet, then the supplier schedule, then the company profile.
                </div>
                {!sources && <div className="hint">Loading this job&apos;s documents…</div>}
                {sources?.error && <div className="authError">{sources.error}</div>}
                {sources && (
                  <>
                    {DocList({ title: "Measure sheet", files: sources.measureSheets, missing: "No measure sheet on this job yet — save one from Site Measure." })}
                    {DocList({ title: "Supplier schedule", files: sources.supplierSchedules, missing: "No supplier schedule on this job — upload it on the job's Files tab as type “Supplier Quote”." })}
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontWeight: 700 }}>Prepared price</div>
                      {sources.prepared ? (
                        <div className="hint">
                          Taken from Prepare Price: {sources.prepared.total.toLocaleString("en-NZ", { style: "currency", currency: "NZD" })} + GST (supplier {sources.prepared.supplierPrice.toLocaleString("en-NZ", { style: "currency", currency: "NZD" })}, install {sources.prepared.installAllowance.toLocaleString("en-NZ", { style: "currency", currency: "NZD" })}) — filled in below.
                        </div>
                      ) : (
                        <div className="hint">No price prepared for this job yet — use Prepare Price first, or type the approved total below.</div>
                      )}
                    </div>
                  </>
                )}
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="checkbox" name="includeProfile" defaultChecked /> Include the AliFrame company profile
                </label>
              </div>
            )}
            <div className="full">
              <label>Quote Wording</label>
              <textarea
                name="wording"
                rows={12}
                placeholder="Paste the finished quote wording here (from the Quote Wording skill)…"
              />
            </div>
          </div>
          {genState.error && <div className="authError">{genState.error}</div>}
          {genState.note && <div className="hint" style={{ marginTop: 6 }}>{genState.note}</div>}
          <div className="actions" style={{ marginTop: 12 }}>
            <button type="submit" className="btn primary" disabled={genPending || !jobNumber}>
              {genPending ? "Generating…" : "Generate Quote PDF"}
            </button>
          </div>
        </form>
      </div>

      {genState.storageKey && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="label">Send to Client</div>
          <div className="hint" style={{ marginTop: 4, marginBottom: 8 }}>
            Quote PDF saved to this job's Files as {genState.fileName}.
          </div>
          <form action={sendAction} style={{ marginTop: 10 }}>
            <input type="hidden" name="jobNumber" value={jobNumber} />
            <input type="hidden" name="storageKey" value={genState.storageKey} />
            <input type="hidden" name="quoteNumber" value={quoteNumber} />
            <label>Email</label>
            <textarea
              name="emailText"
              rows={6}
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
              placeholder={`Hi,\n\nPlease find attached your quote ${quoteNumber || ""}.\n\nLet us know if you have any questions.\n\nKind regards,`}
              style={{ width: "100%" }}
            />
            {sendState.error && <div className="authError">{sendState.error}</div>}
            {sendState.success && <div className="hint">Sent.</div>}
            <div className="actions" style={{ marginTop: 10 }}>
              <button type="submit" className="btn primary" disabled={sendPending}>
                {sendPending ? "Sending…" : "Send Quote to Client"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
