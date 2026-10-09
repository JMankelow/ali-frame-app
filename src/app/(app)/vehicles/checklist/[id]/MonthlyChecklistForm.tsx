// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useActionState, useState } from "react";
import { submitMonthlyChecklist, type MonthlyChecklistState } from "../../checklistActions";
import { MONTHLY_QUESTIONS, isFailure, type ChecklistAnswer, type ChecklistQuestion } from "@/lib/vehicleChecklist";

const initialState: MonthlyChecklistState = {};
const SECTIONS = ["Interior of vehicle", "Exterior of vehicle", "Sign off"] as const;

const box = { border: "1px solid #cbd5e1", background: "#fff", padding: "10px 16px", fontWeight: 600, fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase" as const, cursor: "pointer" };
const heading = { fontWeight: 700, fontSize: 13, letterSpacing: ".06em", textTransform: "uppercase" as const, marginBottom: 12 };

export function MonthlyChecklistForm({
  checklistId,
  vehicleName,
  operatorName,
  signerName,
  defaults,
}: {
  checklistId: string;
  vehicleName: string;
  operatorName: string;
  signerName: string;
  defaults: { date: string; wofExpiry: string; regoExpiry: string; serviceDate: string; lastOdometerKm: number | null };
}) {
  const [state, formAction, pending] = useActionState(submitMonthlyChecklist.bind(null, checklistId), initialState);
  const [answers, setAnswers] = useState<Record<string, ChecklistAnswer | "">>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [signedBy, setSignedBy] = useState("");

  const failures = MONTHLY_QUESTIONS.filter((q) => answers[q.key] && isFailure(q, answers[q.key] as ChecklistAnswer));
  const notSafe = failures.some((q) => q.critical);
  const allOk = (section: string) =>
    setAnswers((cur) => ({
      ...cur,
      ...Object.fromEntries(MONTHLY_QUESTIONS.filter((q) => q.section === section && !q.critical).map((q) => [q.key, q.bad === "Yes" ? "No" : "Yes"])),
    }));
  const answered = MONTHLY_QUESTIONS.filter((q) => answers[q.key]).length;

  function segmented(q: ChecklistQuestion) {
    const opts: ChecklistAnswer[] = q.allowNA ? ["Yes", "No", "N/A"] : ["Yes", "No"];
    return (
      <div style={{ display: "flex", flex: "0 0 auto" }}>
        {opts.map((o) => {
          const on = answers[q.key] === o;
          const bad = on && o === q.bad;
          return (
            <button
              type="button"
              key={o}
              onClick={() => setAnswers((cur) => ({ ...cur, [q.key]: o }))}
              style={{ ...box, padding: "14px 20px", marginLeft: -1, background: bad ? "#b91c1c" : on ? "#111827" : "#fff", color: on ? "#fff" : "#111827", borderColor: bad ? "#b91c1c" : "#cbd5e1" }}
            >
              {o}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <form action={formAction}>
      {MONTHLY_QUESTIONS.map((q) => (
        <input key={q.key} type="hidden" name={`q_${q.key}`} value={answers[q.key] ?? ""} />
      ))}

      <div className="card">
        <div style={heading}>1 · Vehicle details</div>
        <div className="form">
          <div>
            <label>Operator &amp; vehicle</label>
            <input value={`${operatorName} — ${vehicleName}`} readOnly />
          </div>
          <div>
            <label>Date</label>
            <input type="date" name="date" defaultValue={defaults.date} required />
          </div>
          <div>
            <label>Current odometer reading (km)</label>
            <input type="number" name="odometerKm" min={1} required placeholder={defaults.lastOdometerKm ? `Last: ${defaults.lastOdometerKm.toLocaleString()}` : ""} />
          </div>
          <div>
            <label>WOF expiry date</label>
            <input type="date" name="wofExpiry" defaultValue={defaults.wofExpiry} required />
          </div>
          <div>
            <label>Registration expiry date</label>
            <input type="date" name="regoExpiry" defaultValue={defaults.regoExpiry} required />
          </div>
          <div>
            <label>Last service date</label>
            <input type="date" name="serviceDate" defaultValue={defaults.serviceDate} required />
          </div>
          <div>
            <label>Service KMs</label>
            <input name="serviceKms" placeholder="Odometer reading at last service" />
          </div>
        </div>
      </div>

      {SECTIONS.map((section, n) => (
        <div key={section} className="card" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
            <div style={{ ...heading, marginBottom: 0 }}>{n + 2} · {section}</div>
            {section !== "Sign off" && (
              <button type="button" style={box} onClick={() => allOk(section)}>
                All OK
              </button>
            )}
          </div>
          {section === "Sign off" && (
            <div className="hint" style={{ marginBottom: 8 }}>
              A <strong>No</strong> on &ldquo;safe to operate today&rdquo; means <strong>do not drive the vehicle</strong> — it is reported to management straight away.
            </div>
          )}
          {MONTHLY_QUESTIONS.filter((q) => q.section === section).map((q) => {
            const value = answers[q.key] ?? "";
            const failed = value !== "" && isFailure(q, value as ChecklistAnswer);
            return (
              <div key={q.key} style={{ padding: "14px 0 14px 14px", borderTop: "1px solid #e5e7eb", borderLeft: q.critical ? "4px solid #b91c1c" : "4px solid transparent" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 300px", fontWeight: 600, fontSize: 16 }}>
                    {q.text}
                    {q.critical && <span style={{ color: "#b91c1c", fontSize: 11, fontWeight: 600, letterSpacing: ".06em", marginLeft: 8 }}>CRITICAL</span>}
                  </div>
                  {segmented(q)}
                </div>
                {failed && (
                  <textarea
                    name={`r_${q.key}`}
                    rows={2}
                    required
                    value={reasons[q.key] ?? ""}
                    onChange={(e) => setReasons((cur) => ({ ...cur, [q.key]: e.target.value }))}
                    placeholder={q.critical ? "Why is it not safe? (required)" : "What's the problem? (required)"}
                    style={{ width: "100%", marginTop: 10, borderColor: "#b91c1c" }}
                  />
                )}
              </div>
            );
          })}
          {section === "Sign off" && notSafe && (
            <div style={{ marginTop: 14, background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", padding: 14, fontWeight: 700 }}>
              NOT SAFE TO OPERATE — do not drive this vehicle. Submitting reports it to management immediately.
            </div>
          )}
        </div>
      ))}

      <div className="card" style={{ marginTop: 16 }}>
        <div style={heading}>5 · Sign with your name</div>
        <div style={{ background: "#f1efe9", padding: 12, marginBottom: 12, fontSize: 14 }}>
          By putting your name here you confirm you physically checked this vehicle today and the answers above are accurate. You can only sign as yourself ({signerName}).
        </div>
        <div className="form">
          <div>
            <label>Type your full name</label>
            <input name="signedBy" value={signedBy} onChange={(e) => setSignedBy(e.target.value)} placeholder={signerName} autoComplete="off" required />
          </div>
          <div className="full">
            <label style={{ fontWeight: 400, display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" name="confirm" /> I confirm I have checked this vehicle and the answers are accurate.
            </label>
          </div>
        </div>
        <div className="hint" style={{ marginTop: 8 }}>{answered} of {MONTHLY_QUESTIONS.length} questions answered{failures.length ? ` · ${failures.length} issue(s) to report` : ""}.</div>
        {state.error && <div className="authError">{state.error}</div>}
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? "Submitting…" : notSafe ? "Report NOT SAFE & submit" : "Submit vehicle check"}
          </button>
        </div>
      </div>
    </form>
  );
}
