// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useTransition } from "react";
import { forgetDevice } from "./actions";

export function DeviceRow({ id, label, thisDevice, lastUsed, expires }: { id: string; label: string; thisDevice: boolean; lastUsed: string; expires: string }) {
  const [pending, start] = useTransition();
  return (
    <tr>
      <td style={{ fontWeight: 700 }}>{label}{thisDevice && <span className="status green" style={{ marginLeft: 8 }}>This device</span>}</td>
      <td>{lastUsed}</td>
      <td>{expires}</td>
      <td><button type="button" className="btn light" disabled={pending} onClick={() => start(() => forgetDevice(id))}>Forget</button></td>
    </tr>
  );
}
