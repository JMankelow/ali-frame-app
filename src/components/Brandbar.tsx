"use client";

import type { usePins } from "./usePins";

export function Brandbar({ pins }: { pins: ReturnType<typeof usePins> }) {
  return (
    <div className="brandbar">
      <img src="/aliframe-logo-full.svg" alt="Ali-Frame Windows & Doors" />
      <div className="brandbar-pins">
        {pins.pins.map((p, i) => (
          <span className="pinnedItem" key={p.href + p.label}>
            <a className="pinnedItem-label" href={p.href} style={{ color: "inherit", textDecoration: "none" }}>
              {p.label}
            </a>
            <button type="button" className="pinnedItem-remove" title="Unpin" onClick={() => pins.unpinAt(i)}>
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
