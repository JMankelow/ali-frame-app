"use client";

import { useEffect, useState, type ReactNode } from "react";

export interface JobTab {
  key: string;
  label: string;
  content: ReactNode;
}

export function JobTabs({ tabs }: { tabs: JobTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key);

  // Remember the open tab in the address (#photos etc.) so a page refresh — e.g. after uploading photos — stays on it.
  useEffect(() => {
    const h = window.location.hash.replace("#", "");
    if (h && tabs.some((t) => t.key === h)) setActive(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function open(key: string) {
    setActive(key);
    window.history.replaceState(null, "", `#${key}`);
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          paddingBottom: 12,
          borderBottom: "2px solid #0057b8",
          marginBottom: 16,
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => open(t.key)}
            style={{
              border: `1.5px solid ${active === t.key ? "#0057b8" : "#b9dff5"}`,
              cursor: "pointer",
              padding: "8px 14px",
              fontWeight: 700,
              fontSize: 13,
              background: active === t.key ? "#0057b8" : "#e6f4fd",
              color: active === t.key ? "#fff" : "#0b2a4a",
              borderRadius: 8,
              boxShadow: active === t.key ? "0 2px 6px rgba(0,87,184,.35)" : "none",
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
