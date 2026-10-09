"use client";

import { useActionState, useState } from "react";
import { generateRepricing, sendRepricingEmailAction, type GeneratePdfResult, type SendEmailResult } from "./actions";
import { JobPicker, type JobPickerOption } from "@/components/JobPicker";
import { formatMoney } from "@/lib/repricing";

const REASONS = [
  "We went back to the supplier and negotiated a discount.",
  "We reduced the installation allowance after reviewing the programme.",
  "We're providing mobile scaffolding at no charge.",
  "We've discounted rubbish removal and disposal.",
];

const genInitial: GeneratePdfResult = {};
const sendInitial: SendEmailResult = {};

export function PrepareForm({ jobs }: { jobs: JobPickerOption[] }) {
  const [jobNumber, setJobNumber] = useState("");
  const [genState, genAction, genPending] = useActionState(generateRepricing, genInitial);
  const [sendState, sendAction, sendPending] = useActionState(sendRepricingEmailAction, sendInitial);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [otherDifferences, setOtherDifferences] = useState("");
  const [emailText, setEmailText] = useState("");

  function toggleReason(r: string) {
    setSelectedReasons((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  const total = genState.total;
  const draftEmail =
    emailText ||
    (total != null
      ? `Hi,\n\nWe've worked to reduce the price on your install. ${selectedReasons.join(" ")}\n\n` +
        `The revised total is ${formatMoney(total)}${genState ? "" : ""} (see attached pricing page).\n\n` +
        (otherDifferences ? `${otherDifferences}\n\n` : "") +
        `Please let me know if you have any questions.\n\nKind regards,`
      : "");

  return (
    <div>
      <div className="card">
        <div className="label">Job &amp; Pricing Inputs</div>
        <form action={genAction} style={{ marginTop: 10 }}>
          <input type="hidden" name="jobNumber" value={jobNumber} />
          <div className="form">
            <div className="full">
              <label>Job</label>
              <JobPicker jobs={jobs} value={jobNumber} onChange={setJobNumber} />
            </div>

            <div>
              <label>Supplier Price ($, excl. GST)</label>
              <input name="supplierPrice" type="number" step="0.01" required />
            </div>
            <div>
              <label>Margin or Discount</label>
              <select name="marginMode" defaultValue="margin">
                <option value="margin">Margin (adds to supplier price)</option>
                <option value="discount">Discount / Credit (subtracts)</option>
              </select>
            </div>
            <div>
              <label>Amount</label>
              <input name="marginValue" type="number" step="0.01" defaultValue="0" />
            </div>
            <div>
              <label>Unit</label>
              <select name="marginUnit" defaultValue="percent">
                <option value="percent">%</option>
                <option value="dollar">$</option>
              </select>
            </div>

            <div>
              <label>Installation Days</label>
              <input name="installDays" type="number" step="0.5" required />
            </div>
            <div>
              <label>Original Installation Days (optional)</label>
              <input name="installDaysOriginal" type="number" step="0.5" />
            </div>
            <div>
              <label>Installation Allowance ($)</label>
              <input name="installAllowance" type="number" step="0.01" defaultValue="0" />
            </div>
            <div>
              <label>Materials ($)</label>
              <input name="materials" type="number" step="0.01" defaultValue="0" />
            </div>
            <div>
              <label>Rubbish Removal ($)</label>
              <input name="rubbishRemoval" type="number" step="0.01" defaultValue="0" />
            </div>
            <div>
              <label>Scaffolding ($ — 0 for no charge)</label>
              <input name="scaffolding" type="number" step="0.01" defaultValue="0" />
            </div>
            <div>
              <label>Other Description</label>
              <input name="otherLabel" />
            </div>
            <div>
              <label>Other Amount ($)</label>
              <input name="otherAmount" type="number" step="0.01" defaultValue="0" />
            </div>
            <div>
              <label>GST Basis</label>
              <select name="gstBasis" defaultValue="excluding">
                <option value="excluding">Prices exclude GST</option>
                <option value="including">Prices include GST</option>
              </select>
            </div>
          </div>

          {genState.error && <div className="authError">{genState.error}</div>}
          <div className="actions" style={{ marginTop: 12 }}>
            <button type="submit" className="btn primary" disabled={genPending || !jobNumber}>
              {genPending ? "Generating…" : "Generate Pricing PDF"}
            </button>
          </div>
        </form>
      </div>

      {genState.lines && genState.total != null && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="label">Pricing Page Preview</div>
          <table style={{ marginTop: 8 }}>
            <tbody>
              {genState.lines.map((l, i) => (
                <tr key={i}>
                  <td>{l.label}</td>
                  <td style={{ textAlign: "right" }}>{formatMoney(l.amount)}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 600, borderTop: "2px solid #0057b8" }}>
                <td>Total</td>
                <td style={{ textAlign: "right" }}>{formatMoney(genState.total)}</td>
              </tr>
            </tbody>
          </table>
          <div className="hint" style={{ marginTop: 8 }}>PDF saved to this job's Files as {genState.fileName}.</div>
        </div>
      )}

      {genState.total != null && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="label">Customer Email</div>
          <div className="hint" style={{ marginTop: 4, marginBottom: 8 }}>
            Pick the reasons that apply, add any other quote differences, then edit the draft before sending.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
            {REASONS.map((r) => (
              <label key={r} style={{ fontWeight: 400, display: "flex", alignItems: "center", gap: 6 }}>
                <input type="checkbox" checked={selectedReasons.includes(r)} onChange={() => toggleReason(r)} />
                {r}
              </label>
            ))}
          </div>
          <label>Other quote differences (only if supported by the schedules/comparison)</label>
          <textarea
            rows={3}
            style={{ width: "100%", marginBottom: 10 }}
            value={otherDifferences}
            onChange={(e) => setOtherDifferences(e.target.value)}
          />
          <label>Email Draft</label>
          <textarea
            rows={10}
            style={{ width: "100%" }}
            value={draftEmail}
            onChange={(e) => setEmailText(e.target.value)}
          />

          <form action={sendAction} style={{ marginTop: 10 }}>
            <input type="hidden" name="jobNumber" value={jobNumber} />
            <input type="hidden" name="storageKey" value={genState.storageKey ?? ""} />
            <input type="hidden" name="emailText" value={draftEmail} />
            {sendState.error && <div className="authError">{sendState.error}</div>}
            {sendState.success && <div className="hint">Sent.</div>}
            <div className="actions" style={{ marginTop: 10 }}>
              <button type="submit" className="btn primary" disabled={sendPending}>
                {sendPending ? "Sending…" : "Send Email to Client"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
