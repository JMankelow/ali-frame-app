"use client";

import { useActionState, useState } from "react";
import { bookCheckMeasure, type BookCheckMeasureFormState } from "./actions";
import { JobPicker, type JobPickerOption } from "@/components/JobPicker";

const initialState: BookCheckMeasureFormState = {};

export function BookCheckMeasureForm({
  jobs,
  fixedJobNumber,
  fixedClientName,
}: {
  jobs?: JobPickerOption[];
  fixedJobNumber?: string;
  fixedClientName?: string;
}) {
  const [jobNumber, setJobNumber] = useState(fixedJobNumber ?? "");
  const [state, formAction, pending] = useActionState(bookCheckMeasure, initialState);
  const [dates, setDates] = useState<string[]>([""]);

  const job = jobs?.find((j) => j.number === jobNumber);
  const clientName = fixedClientName ?? job?.title ?? "";

  const previewDates = dates
    .filter(Boolean)
    .map((d) => new Date(d).toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" }));

  const preview =
    `Hi,\n\n` +
    `We are ready to book your final check measure for ${jobNumber || "[job]"} ${clientName}.\n\n` +
    (previewDates.length > 0
      ? `We have availability on the following dates:\n${previewDates.map((d) => `- ${d}`).join("\n")}\n\n`
      : "We have availability on [pick dates below]\n\n") +
    `Let me know which one suits and a suitable time.\n\n[Your name]`;

  return (
    <div className="card">
      <div className="label">Book Check Measure — Email Client</div>
      <div className="hint" style={{ marginTop: 4 }}>
        Once the deposit's in, pick the dates you can offer and send. This emails the client and moves the job to
        Check Measure Required.
      </div>

      <form action={formAction} style={{ marginTop: 10 }}>
        <input type="hidden" name="jobNumber" value={jobNumber} />
        <div className="form">
          {!fixedJobNumber && jobs && (
            <div className="full">
              <label>Job</label>
              <JobPicker jobs={jobs} value={jobNumber} onChange={setJobNumber} />
            </div>
          )}
          <div className="full">
            <label>Available Dates</label>
            {dates.map((d, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <input
                  type="date"
                  name="dates"
                  value={d}
                  required
                  onChange={(e) => {
                    const v = e.target.value;
                    setDates((prev) => prev.map((x, idx) => (idx === i ? v : x)));
                  }}
                />
                {dates.length > 1 && (
                  <button
                    type="button"
                    className="btn light"
                    onClick={() => setDates((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn light" onClick={() => setDates((prev) => [...prev, ""])}>
              + Add another date
            </button>
          </div>
          <div className="full">
            <label>Email Preview</label>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                background: "#f4f6fa",
                padding: 10,
                borderRadius: 8,
                fontFamily: "inherit",
                margin: 0,
              }}
            >
              {preview}
            </pre>
          </div>
        </div>
        {state.error && <div className="authError">{state.error}</div>}
        {state.success && <div className="hint">Sent — job moved to Check Measure Required.</div>}
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="submit" className="btn primary" disabled={pending || !jobNumber}>
            {pending ? "Sending…" : "Send & Book Check Measure"}
          </button>
        </div>
      </form>
    </div>
  );
}
