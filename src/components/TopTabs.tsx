"use client";

import { NAV_TREE } from "./navTree";

export function TopTabs({ selected, onSelect }: { selected: string | null; onSelect: (label: string) => void }) {
  return (
    <nav className="topTabs">
      {NAV_TREE.map((group) => (
        <button
          key={group.label}
          type="button"
          className={`topTab${selected === group.label ? " active" : ""}`}
          onClick={() => onSelect(group.label)}
        >
          {group.label}
        </button>
      ))}
    </nav>
  );
}
