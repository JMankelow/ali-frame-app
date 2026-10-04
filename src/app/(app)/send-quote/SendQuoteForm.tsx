"use client";

import { useActionState, useState } from "react";
import { generateQuote, sendQuoteEmail, type GenerateQuoteResult, type SendQuoteEmailResult } from "./actions";
import { JobPicker, type JobPickerOption } from "@/components/JobPicker";
import { buildSharePointSearchUrl } from "@/lib/sharepoint";

const genInitial: GenerateQuoteResult = {};
const sendInitial: SendQuoteEmailResult = {};

export function SendQuoteForm({ jobs, suggestedTotals }: { jobs: JobPickerOption[]; suggestedTotals: Record<string, number> }) {
  const [jobNumber, setJobNumber] = useState("");
  const [genState, genAction, genPending] = useActionState(generateQuote, genInitial);
  const [sendState, sendAction, sendPending] = useActionState(sendQuoteEmail, sendInitial);
  const [quoteNumber, setQuoteNumber] = useState("");
  const [emailText, setEmailText] = useState("");

  return (
    <div>
      {jobNumber && (
        <div className="card">
          <div className="topbar" style={{ marginBottom: 8 }}>
            <div className="label">Source Documents</div>
            <a href={buildSharePointSearchUrl(jobNumber)} target="_blank" rel="noopener noreferrer" className="btn light">
              Find in SharePoint ↗
            </a>
          </div>
          <div className="hint">
            The measure sheet, supplier schedule and install price live in this job's SharePoint folder. Ask Claude in
            chat to prepare the quote wording from those (using the Quote Wording skill) if it isn't ready yet, then
            paste the finished wording and approved total below.
          </div>
        </div>
      )}

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
