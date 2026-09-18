"use client";

import { useActionState, useState } from "react";
import { updateVehicleDetails, emailMechanicToBook, reportVehicleIssue, resolveVehicleIssue, type VehicleUpdateState, type MechanicEmailState, type VehicleIssueFormState } from "./actions";

const updateInitial: VehicleUpdateState = {};
const emailInitial: MechanicEmailState = {};
const issueInitial: VehicleIssueFormState = {};

function toDateInput(d: string | null): string {
  if (!d) return "";
  return d.slice(0, 10);
}

export interface VehicleIssueItem {
  id: string;
  type: string;
  description: string;
  status: string;
  raisedByName: string;
  createdAt: string;
}

export function VehicleCard({
  id,
  name,
  rego,
  assignedToUserId,
  mechanicEmail,
  wofDueDate,
  regoDueDate,
  serviceDueDate,
  staff,
  issues,
}: {
  id: string;
  name: string;
  rego: string | null;
  assignedToUserId: string | null;
  mechanicEmail: string | null;
  wofDueDate: string | null;
  regoDueDate: string | null;
  serviceDueDate: string | null;
  staff: { id: string; name: string }[];
  issues: VehicleIssueItem[];
}) {
  const [updateState, updateAction, updatePending] = useActionState(updateVehicleDetails, updateInitial);
  const [emailState, emailAction, emailPending] = useActionState(emailMechanicToBook, emailInitial);
  const [issueState, issueAction, issuePending] = useActionState(reportVehicleIssue, issueInitial);
  const [showEmail, setShowEmail] = useState(false);
  const [showIssue, setShowIssue] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const overdue = (d: string | null) => !!d && d.slice(0, 10) < today;

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="label">
        {name}
        {rego && rego !== name ? ` (${rego})` : ""}
      </div>

      <form action={updateAction} style={{ marginTop: 10 }}>
        <input type="hidden" name="vehicleId" value={id} />
        <div className="form">
          <div>
            <label>Assigned Driver</label>
            <select name="assignedToUserId" defaultValue={assignedToUserId ?? ""}>
              <option value="">— Unassigned —</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Mechanic Email</label>
            <input name="mechanicEmail" type="email" defaultValue={mechanicEmail ?? ""} placeholder="mechanic@example.co.nz" />
          </div>
          <div>
            <label style={{ color: overdue(wofDueDate) ? "#dc2626" : undefined }}>WOF Due{overdue(wofDueDate) ? " (Overdue)" : ""}</label>
            <input name="wofDueDate" type="date" defaultValue={toDateInput(wofDueDate)} />
          </div>
          <div>
            <label style={{ color: overdue(regoDueDate) ? "#dc2626" : undefined }}>Rego Due{overdue(regoDueDate) ? " (Overdue)" : ""}</label>
            <input name="regoDueDate" type="date" defaultValue={toDateInput(regoDueDate)} />
          </div>
          <div>
            <label style={{ color: overdue(serviceDueDate) ? "#dc2626" : undefined }}>Service Due{overdue(serviceDueDate) ? " (Overdue)" : ""}</label>
            <input name="serviceDueDate" type="date" defaultValue={toDateInput(serviceDueDate)} />
          </div>
        </div>
        {updateState.error && <div className="authError">{updateState.error}</div>}
        <div className="actions" style={{ marginTop: 10 }}>
          <button type="submit" className="btn light" disabled={updatePending}>
            {updatePending ? "Saving…" : "Save Details"}
          </button>
          <button type="button" className="btn primary" onClick={() => setShowEmail((v) => !v)}>
            Email Mechanic to Book
          </button>
          <button type="button" className="btn light" onClick={() => setShowIssue((v) => !v)}>
            Notify Issue / Request Service
          </button>
        </div>
      </form>

      {showEmail && (
        <form action={emailAction} style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          <input type="hidden" name="vehicleId" value={id} />
          <div className="form">
            <div>
              <label>Mechanic Email</label>
              <input name="mechanicEmail" type="email" defaultValue={mechanicEmail ?? ""} required />
            </div>
            <div className="full">
              <label>Message</label>
              <textarea name="message" rows={2} placeholder={`Please book in ${name} for a service/check when convenient.`} />
            </div>
          </div>
          {emailState.error && <div className="authError">{emailState.error}</div>}
          {emailState.sent && <div className="hint" style={{ marginTop: 6 }}>Email sent.</div>}
          <div className="actions" style={{ marginTop: 8 }}>
            <button type="submit" className="btn primary" disabled={emailPending}>
              {emailPending ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      )}

      {showIssue && (
        <form action={issueAction} style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          <input type="hidden" name="vehicleId" value={id} />
          <div className="form">
            <div>
              <label>Type</label>
              <select name="type" defaultValue="Issue">
                <option>Issue</option>
                <option>Service Request</option>
              </select>
            </div>
            <div className="full">
              <label>Description</label>
              <textarea name="description" rows={2} required />
            </div>
          </div>
          {issueState.error && <div className="authError">{issueState.error}</div>}
          <div className="actions" style={{ marginTop: 8 }}>
            <button type="submit" className="btn primary" disabled={issuePending}>
              {issuePending ? "Submitting…" : "Submit"}
            </button>
          </div>
        </form>
      )}

      {issues.length > 0 && (
        <div style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          <div className="hint" style={{ fontWeight: 800, marginBottom: 6 }}>
            Open Issues / Requests
          </div>
          <table>
            <tbody>
              {issues.map((i) => (
                <tr key={i.id}>
                  <td>
                    <span className={`status ${i.type === "Service Request" ? "blue" : "orange"}`}>{i.type}</span>
                  </td>
                  <td>{i.description}</td>
                  <td>{i.raisedByName}</td>
                  <td>
                    <form action={resolveVehicleIssue.bind(null, i.id)}>
                      <button type="submit" className="btn light">
                        Resolve
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
