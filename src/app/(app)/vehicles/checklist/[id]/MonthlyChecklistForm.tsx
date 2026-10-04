// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useActionState, useState } from "react";
import { submitMonthlyChecklist, type MonthlyChecklistState } from "../../checklistActions";
import { MONTHLY_QUESTIONS, isFailure, type ChecklistAnswer } from "@/lib/vehicleChecklist";

const initialState: MonthlyChecklistState = {};
const SECTIONS = ["Interior of vehicle", "Exterior of vehicle", "Sign off"] as const;

export function MonthlyChecklistForm({
  checklistId,
  vehicleName,
  operatorName,
  defaults,
}: {
  checklistId: string;
  vehicleName: string;
  operatorName: string;
  defaults: { date: string; wofExpiry: string; regoExpiry: string; serviceDate: string; lastOdometerKm: number | null };
}) {
  const [state, formAction, pending] = useActionState(submitMonthlyChecklist.bind(null, checklistId), initialState);
  const [answers, setAnswers] = useState<Record<string, ChecklistAnswer | "">>({});

  return (
    <form action={formAction}>
      <div className="card">
        <div className="label">Vehicle details</div>
        <div className="form" style={{ marginTop: 10 }}>
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

      {SECTIONS.map((section) => (
        <div key={section} className="card" style={{ marginTop: 16 }}>
          <div className="label">{section} checklist</div>
          {MONTHLY_QUESTIONS.filter((q) => q.section === section).map((q) => {
            const value = answers[q.key] ?? "";
            const failed = value !== "" && isFailure(q, value);
            const options: ChecklistAnswer[] = q.allowNA ? ["Yes", "No", "N/A"] : q.bad === "Yes" ? ["No", "Yes"] : ["Yes", "No"];
            return (
              <div key={q.key} style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                <div style={{ fontWeight: 600 }}>{q.text}</div>
                <div style={{ display: "flex", gap: 18, marginTop: 6 }}>
                  {options.map((o) => (
                    <label key={o} style={{ fontWeight: 400, display: "flex", gap: 6, alignItems: "center" }}>
                      <input type="radio" name={`q_${q.key}`} value={o} required checked={value === o} onChange={() => setAnswers((a) => ({ ...a, [q.key]: o }))} />
                      {o}
                    </label>
                  ))}
                </div>
                {failed && (
                  <textarea
                    name={`r_${q.key}`}
                    rows={2}
                    required
                    placeholder={q.critical ? "Why is it not safe? (required)" : "What's the problem? (required)"}
                    style={{ width: "100%", marginTop: 8, borderColor: "#dc2626" }}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="label">Signature</div>
        <div className="form" style={{ marginTop: 10 }}>
          <div>
            <label>Type your full name to sign</label>
            <input name="signedBy" required defaultValue="" autoComplete="off" />
          </div>
          <div className="full">
            <label style={{ fontWeight: 400, display: "flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" name="confirm" /> I confirm I have physically checked this vehicle and the answers above are accurate.
            </label>
          </div>
        </div>
        {state.error && <div className="authError">{state.error}</div>}
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? "Submitting…" : "Submit Vehicle Check"}
          </button>
        </div>
      </div>
    </form>
  );
}
