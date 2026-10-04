// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useActionState } from "react";
import { reportVehicleIssue, type VehicleIssueFormState } from "./actions";

const initial: VehicleIssueFormState = {};

export function VehicleIssueForm({ vehicleId }: { vehicleId: string }) {
  const [state, action, pending] = useActionState(reportVehicleIssue, initial);
  return (
    <form action={action} style={{ marginTop: 12 }}>
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <div className="form">
        <div>
          <label>Type</label>
          <select name="type" defaultValue="Issue">
            <option>Issue</option>
            <option>Service Request</option>
          </select>
        </div>
        <div className="full">
          <label>What&apos;s wrong / what do you need?</label>
          <textarea name="description" rows={2} required />
        </div>
      </div>
      {state.error && <div className="authError">{state.error}</div>}
      <div className="actions" style={{ marginTop: 8 }}>
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? "Submitting…" : "Report to the office"}
        </button>
      </div>
    </form>
  );
}
