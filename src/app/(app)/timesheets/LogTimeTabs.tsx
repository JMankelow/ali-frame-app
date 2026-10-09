// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useState, type ReactNode } from "react";

/** Log time: either start/stop the clock, or add hours by hand. */
export function LogTimeTabs({ clock, form, startOn = "clock" }: { clock: ReactNode; form: ReactNode; startOn?: "clock" | "hours" }) {
  const [tab, setTab] = useState<"clock" | "hours">(startOn);
  const btn = (key: "clock" | "hours", label: string) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      style={{
        flex: 1, padding: "12px 10px", fontWeight: 600, fontSize: 15, cursor: "pointer", borderRadius: 10,
        border: `2px solid ${tab === key ? "#0057b8" : "#b9dff5"}`, background: tab === key ? "#0057b8" : "#e6f4fd", color: tab === key ? "#fff" : "#0b2a4a",
      }}
    >
      {label}
    </button>
  );
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {btn("clock", "⏱ Start / stop clock")}
        {btn("hours", "✎ Add hours")}
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ display: tab === "clock" ? "block" : "none" }}>{clock}</div>
        <div style={{ display: tab === "hours" ? "block" : "none" }}>{form}</div>
      </div>
    </div>
  );
}
