"use client";

import { useActionState } from "react";
import { createAsset, type AssetFormState } from "./actions";
import { ASSET_TYPES } from "./assetTypes";

const assetInitial: AssetFormState = {};

export function AssetForm({
  staff,
  vehicles,
}: {
  staff: { id: string; name: string }[];
  vehicles: { id: string; name: string }[];
}) {
  const [assetState, assetAction, assetPending] = useActionState(createAsset, assetInitial);

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="label">Add Asset</div>
      <form action={assetAction} style={{ marginTop: 10 }}>
        <div className="form">
          <div>
            <label htmlFor="name">Asset Name</label>
            <input id="name" name="name" placeholder="e.g. Makita Drill Set" required />
          </div>
          <div>
            <label htmlFor="assetType">Type</label>
            <select id="assetType" name="assetType" defaultValue="Other">
              {ASSET_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="assignedToUserId">Assign to Person</label>
            <select id="assignedToUserId" name="assignedToUserId" defaultValue="">
              <option value="">— None —</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="assignedToVehicleId">Assign to Vehicle</label>
            <select id="assignedToVehicleId" name="assignedToVehicleId" defaultValue="">
              <option value="">— None —</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="testTagDueDate">Test &amp; Tag Due (if electrical)</label>
            <input id="testTagDueDate" name="testTagDueDate" type="date" />
          </div>
          <div className="full">
            <label htmlFor="description">Description</label>
            <input id="description" name="description" />
          </div>
        </div>
        {assetState.error && <div className="authError">{assetState.error}</div>}
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="submit" className="btn primary" disabled={assetPending}>
            {assetPending ? "Adding…" : "Add Asset"}
          </button>
        </div>
      </form>
    </div>
  );
}
