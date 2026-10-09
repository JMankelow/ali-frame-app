"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { ALL_TYPES } from "./types";

export function CalendarFilters({ activeTypes, types = ALL_TYPES }: { activeTypes: string[]; types?: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function go(next: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.length === types.length) params.delete("types"); // everything ticked = the default
    else params.set("types", next.length === 0 ? "none" : next.join(","));
    router.push(`${pathname}?${params.toString()}`);
  }
  const toggle = (type: string) => go(activeTypes.includes(type) ? activeTypes.filter((t) => t !== type) : [...activeTypes, type]);
  const allOn = activeTypes.length === types.length;

  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
      <button type="button" className="btn light" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => go(allOn ? [] : [...types])}>
        {allOn ? "Untick all" : "Tick all"}
      </button>
      {types.map((t) => (
        <label key={t} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <input type="checkbox" checked={activeTypes.includes(t)} onChange={() => toggle(t)} />
          {t}
        </label>
      ))}
    </div>
  );
}
