"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export const ALL_TYPES = ["Installation", "Check Measure", "Sales Measure", "Remedial", "Leave", "Vehicle Maintenance"];

export function CalendarFilters({ activeTypes }: { activeTypes: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function toggle(type: string) {
    const next = activeTypes.includes(type) ? activeTypes.filter((t) => t !== type) : [...activeTypes, type];
    const params = new URLSearchParams(searchParams.toString());
    if (next.length === ALL_TYPES.length || next.length === 0) {
      params.delete("types");
    } else {
      params.set("types", next.join(","));
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
      {ALL_TYPES.map((t) => (
        <label key={t} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <input type="checkbox" checked={activeTypes.includes(t)} onChange={() => toggle(t)} />
          {t}
        </label>
      ))}
    </div>
  );
}
