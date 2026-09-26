"use client";

import { NAV_TREE } from "./navTree";

export function TopTabs({
  selected,
  onSelect,
  visibleSections,
}: {
  selected: string | null;
  onSelect: (label: string) => void;
  visibleSections: string[];
}) {
  return (
    <nav className="topTabs">
      {NAV_TREE.filter((group) => visibleSections.includes(group.label)).map((group) => (
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
