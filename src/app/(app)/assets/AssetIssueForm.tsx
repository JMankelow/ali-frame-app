"use client";

import { useActionState } from "react";
import { reportAssetIssue, type AssetIssueFormState } from "./actions";

const initialState: AssetIssueFormState = {};

export function AssetIssueForm({ assets }: { assets: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(reportAssetIssue, initialState);

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="label">Report an Issue / Needs Repair</div>
      <form action={formAction} style={{ marginTop: 10 }}>
        <div className="form">
          <div>
            <label htmlFor="assetId">Asset</label>
            <select id="assetId" name="assetId" defaultValue="" required>
              <option value="" disabled>
                Select asset...
              </option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="full">
            <label htmlFor="description">Issue</label>
            <textarea id="description" name="description" rows={2} required placeholder="What's wrong with it?" />
          </div>
        </div>
        {state.error && <div className="authError">{state.error}</div>}
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="submit" className="btn light" disabled={pending}>
            {pending ? "Reporting…" : "Report Issue"}
          </button>
        </div>
      </form>
    </div>
  );
}
