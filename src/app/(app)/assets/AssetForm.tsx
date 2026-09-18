"use client";

import { useActionState } from "react";
import { createAsset, createVehicle, type AssetFormState, type VehicleFormState } from "./actions";

const assetInitial: AssetFormState = {};
const vehicleInitial: VehicleFormState = {};

export function AssetForm({
  staff,
  vehicles,
}: {
  staff: { id: string; name: string }[];
  vehicles: { id: string; name: string }[];
}) {
  const [assetState, assetAction, assetPending] = useActionState(createAsset, assetInitial);
  const [vehicleState, vehicleAction, vehiclePending] = useActionState(createVehicle, vehicleInitial);

  return (
    <>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="label">Add Asset</div>
        <form action={assetAction} style={{ marginTop: 10 }}>
          <div className="form">
            <div>
              <label htmlFor="name">Asset Name</label>
              <input id="name" name="name" placeholder="e.g. Makita Drill Set" required />
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

      <div className="card" style={{ marginTop: 16 }}>
        <div className="label">Add Vehicle</div>
        <form action={vehicleAction} style={{ marginTop: 10 }}>
          <div className="form">
            <div>
              <label htmlFor="vname">Vehicle Name / Rego</label>
              <input id="vname" name="name" placeholder="e.g. PWU811" required />
            </div>
            <div>
              <label htmlFor="vrego">Rego (if different)</label>
              <input id="vrego" name="rego" />
            </div>
          </div>
          {vehicleState.error && <div className="authError">{vehicleState.error}</div>}
          <div className="actions" style={{ marginTop: 12 }}>
            <button type="submit" className="btn light" disabled={vehiclePending}>
              {vehiclePending ? "Adding…" : "Add Vehicle"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
