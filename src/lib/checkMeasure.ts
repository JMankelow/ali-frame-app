// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.

// Shared shape of a check-measure pack (see the "Operations - Create Check Measure" skill and the approved template).

export interface CheckMeasureItem {
  location: string; // e.g. "Toilet"  -> "Item 1: Toilet"
  quantity: string;
  level: string;
  colour: string; // Colour / finish
  frameType: string;
  trimSize: string;
  reveal: string;
  hardware: string; // Hardware & finish
  windLoading: string;
  glass: string;
  flashing: string; // Flashing / sill
  notes: string; // T.W.T, weight, infills, cladding, quote comments
  width: string; // mm — shown beside the supplier drawing
  height: string; // mm
}

export interface CheckMeasureData {
  quoteNumber: string;
  supplierName: string;
  siteAddress: string;
  clientName: string;
  /** Install amount ($, excl. GST) and onsite team size — drive the single Labour Allowance line. */
  installAmount: string;
  teamSize: string;
  /** If the install-price sheet states more than one crew/day combination, put each line here (overrides the calculation). */
  labourLines: string;
  materials: string;
  rubbish: string;
  scaffolding: string;
  otherInfo: string;
  /** "Supply and installation of:" followed by one line per supplied item / spec. */
  summary: string;
  /** Installation notes & exclusions — one per line. */
  notes: string;
  items: CheckMeasureItem[];
  /** Supplier schedule PDF (a "Supplier Quote" file on the job) whose drawing pages are appended, and which pages. */
  supplierFileId: string;
  supplierPages: string; // e.g. "2-5,7"
}

export const emptyItem = (): CheckMeasureItem => ({
  location: "", quantity: "1", level: "", colour: "", frameType: "", trimSize: "", reveal: "", hardware: "", windLoading: "", glass: "", flashing: "", notes: "", width: "", height: "",
});

export const emptyPack = (): CheckMeasureData => ({
  quoteNumber: "", supplierName: "", siteAddress: "", clientName: "",
  installAmount: "", teamSize: "2", labourLines: "", materials: "", rubbish: "", scaffolding: "", otherInfo: "",
  summary: "Supply and installation of:\n", notes: "", items: [emptyItem()], supplierFileId: "", supplierPages: "",
});

const num = (s: string) => {
  const n = Number(String(s ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};
export const dollars = (s: string) => {
  const n = num(s);
  return n == null ? "" : n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" });
};
const trim = (n: number) => String(Math.round(n * 100) / 100).replace(/\.0+$/, "");

/** "$750.00 — 10 hrs × 2 guys × 0.5 day": total hrs = install amount ÷ $75; days = hrs ÷ 10 ÷ team size. */
export function labourLine(installAmount: string, teamSize: string): string {
  const amount = num(installAmount);
  const team = num(teamSize);
  if (amount == null || amount <= 0 || team == null || team <= 0) return "";
  const hrs = amount / 75;
  return `${dollars(installAmount)} — ${trim(hrs)} hrs × ${trim(team)} guys × ${trim(hrs / 10 / team)} day`;
}

/** Sanitises whatever the form posts into a safe, bounded pack. */
export function cleanPack(raw: unknown): CheckMeasureData {
  const base = emptyPack();
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const s = (v: unknown, max = 600) => (typeof v === "string" ? v.slice(0, max) : "");
  const out: CheckMeasureData = {
    quoteNumber: s(r.quoteNumber, 40), supplierName: s(r.supplierName, 120), siteAddress: s(r.siteAddress, 240), clientName: s(r.clientName, 160),
    installAmount: s(r.installAmount, 20), teamSize: s(r.teamSize, 6) || base.teamSize, labourLines: s(r.labourLines, 600),
    materials: s(r.materials, 40), rubbish: s(r.rubbish, 80), scaffolding: s(r.scaffolding, 120), otherInfo: s(r.otherInfo, 800),
    summary: s(r.summary, 3000), notes: s(r.notes, 3000), items: [], supplierFileId: s(r.supplierFileId, 40), supplierPages: s(r.supplierPages, 60),
  };
  const items = Array.isArray(r.items) ? r.items.slice(0, 40) : [];
  out.items = items.map((it) => {
    const o = (it && typeof it === "object" ? it : {}) as Record<string, unknown>;
    const e = emptyItem();
    for (const k of Object.keys(e) as (keyof CheckMeasureItem)[]) e[k] = s(o[k], k === "notes" ? 800 : 300);
    return e;
  });
  if (out.items.length === 0) out.items = [emptyItem()];
  return out;
}

/** "2-5,7" -> [2,3,4,5,7] (1-based), capped. */
export function parsePageRange(spec: string, max = 60): number[] {
  const pages = new Set<number>();
  for (const part of spec.split(",")) {
    const m = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!m) continue;
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    for (let p = Math.min(a, b); p <= Math.max(a, b) && pages.size < max; p++) if (p >= 1) pages.add(p);
  }
  return [...pages].sort((x, y) => x - y);
}
