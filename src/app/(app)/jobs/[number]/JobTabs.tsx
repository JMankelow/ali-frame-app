"use client";

import { useState, type ReactNode } from "react";

export interface JobTab {
  key: string;
  label: string;
  content: ReactNode;
}

export function JobTabs({ tabs }: { tabs: JobTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key);

  return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          borderBottom: "2px solid #111827",
          marginBottom: 16,
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            style={{
              border: "none",
              cursor: "pointer",
              padding: "8px 14px",
              fontWeight: 700,
              fontSize: 13,
              background: active === t.key ? "#111827" : "transparent",
              color: active === t.key ? "#fff" : "#111827",
              borderRadius: "6px 6px 0 0",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.key} style={{ display: active === t.key ? "block" : "none" }}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
