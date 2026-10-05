// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.

// Aliframe QA check sheets (Residential: 17 items from the SiteApp Pro form; Commercial: full QA per window/door item).

// ---------- Residential ----------

export const RES_CHECKS: [number, string][] = [
  [3, "All items & extras delivered"],
  [4, "Items match the scope & sizes"],
  [5, "No scratches, chips or damage"],
  [6, "Frame & glass free from defects"],
  [7, "All hardware is correct"],
  [8, "All units open, close and lock correctly"],
  [9, "Units fixed correctly, level & square"],
  [10, "Rod, foam & silicone complete"],
  [11, "Architraves, scribers and facings complete"],
  [12, "Work area clean and finishes checked"],
];
export const RES_FINAL: [number, string] = [14, "Installation Complete"];
export const RES_REMEDIAL: [number, string] = [16, "Remedial has been reported and photos taken"];
export const RES_CONFIRM = "I confirm this installation has been checked and meets Aliframe QA standards";

/** Every photo must be labelled, with a description written underneath. */
export type PhotoMeta = Record<string, { label: string; description: string }>;

export type YesNo = { a: "Yes" | "No" | ""; reason: string };
export interface ResidentialData {
  date: string;
  answers: Record<string, YesNo>; // keys q3..q12, q14, q16
  photoFileIds: string[]; // final completion photo(s)
  photoMeta: PhotoMeta;
  teamLeaderId: string;
  teamLeaderName: string;
  confirmed: boolean;
}

export const emptyResidential = (date: string): ResidentialData => ({ date, answers: {}, photoFileIds: [], photoMeta: {}, teamLeaderId: "", teamLeaderName: "", confirmed: false });

/** What's still missing before a residential sheet can be completed. */
export function residentialProblems(d: ResidentialData): string[] {
  const out: string[] = [];
  for (const [n, t] of [...RES_CHECKS, RES_FINAL]) {
    const x = d.answers[`q${n}`];
    if (!x || !x.a) out.push(`${n}. ${t}: answer Yes or No`);
    else if (x.a === "No" && !x.reason.trim()) out.push(`${n}. ${t}: give a reason for "No"`);
  }
  if (!d.answers[`q${RES_REMEDIAL[0]}`]?.a) out.push(`${RES_REMEDIAL[0]}. ${RES_REMEDIAL[1]}: answer Yes or No`);
  if (d.photoFileIds.length === 0) out.push("15. Final completion photo: add at least one");
  else if (d.photoFileIds.some((id) => !d.photoMeta?.[id]?.label.trim())) out.push("15. Final completion photo: every photo must be labelled");
  if (!d.teamLeaderName.trim()) out.push("17. Team leader: choose who is signing off");
  if (!d.confirmed) out.push("17. Confirm the installation meets Aliframe QA standards");
  return out;
}

// ---------- Commercial ----------

export interface ComSection {
  id: "prep" | "inst" | "final";
  title: string;
  checks: string[];
  photo: string;
  notes: string;
}
export const COM_SECTIONS: ComSection[] = [
  {
    id: "prep",
    title: "QA – Preparation",
    checks: [
      "Weather/waterproofing completed",
      "Opening sizes and rebates checked and approved by installer",
      "Opening substrate checked and approved",
      "6mm minimum air seal gap around perimeter",
      "Air seal to perimeter (between 6mm min to 20mm max)",
    ],
    photo: "Preparation Photo Evidence",
    notes: "Preparation notes or issues",
  },
  {
    id: "inst",
    title: "QA – Installation",
    checks: [
      "Fixings installed according to shop drawings and PS1",
      "Sill support bars or flat bars installed where applicable",
      "Adequate packing and fixings used",
      "Joinery installed plumb, level and straight",
      "PEF rod and internal seal installed correctly",
      "Correct PEF rod size and location confirmed",
      "Sika AT Façade sealant used",
      "Fixing screws sealed",
      "Fixing adaptor air seal and fixing screws oversealed",
      "Fixing angles/plates installed according to shop drawings",
      "Rain-shield angles sealed at jambs to precast/brick",
      "Head flashing or rain shield fitted",
    ],
    photo: "Installation Photo Evidence",
    notes: "Installation notes or issues",
  },
  {
    id: "final",
    title: "QA – Final Completion",
    checks: ["Final operation and visual check completed", "Area left clean and tidy"],
    photo: "Final Completion Photo Evidence",
    notes: "Final Completion notes or issues",
  },
];

export type Result = "Pass" | "Fail" | "NA" | "";
export interface Stamped {
  r: Result;
  note: string; // required for a Fail
  by: string; // senior leader's name — set by the server, never the browser
  at: string; // ISO time — set by the server
}
export interface ComItemQa {
  checks: Record<string, Stamped>; // "prep.0" … "final.1"
  photos: Record<string, string[]>; // section id -> FileAsset ids
  photoMeta: PhotoMeta;
  notes: Record<string, string>; // section id -> text ("Nil" if none)
  tl: { name: string; date: string; comments: string; sig: string; by: string; at: string };
}
export interface ComItem {
  id: string;
  n: string; // item number
  code: string; // drawing ref e.g. 2A.200.W10
  loc: string; // location
  qa: ComItemQa;
}
export interface CommercialData {
  date: string;
  installers: string;
  items: ComItem[];
}

export const newComId = () => Math.random().toString(36).slice(2, 10);
export const emptyQa = (): ComItemQa => ({ checks: {}, photos: {}, photoMeta: {}, notes: {}, tl: { name: "", date: "", comments: "", sig: "", by: "", at: "" } });
export const emptyComItem = (): ComItem => ({ id: newComId(), n: "", code: "", loc: "", qa: emptyQa() });
export const emptyCommercial = (date: string): CommercialData => ({ date, installers: "", items: [emptyComItem()] });

export const checkKey = (sec: string, i: number) => `${sec}.${i}`;
export const itemTotal = () => COM_SECTIONS.reduce((a, s) => a + s.checks.length + 2, 0) + 3; // checks + photos + notes per section + TL name/date/signature

/** What's still missing on one item (empty = complete). Fails are listed as problems to resolve, not as blockers to sign off. */
export function itemProblems(it: ComItem): string[] {
  const out: string[] = [];
  const q = it.qa;
  for (const s of COM_SECTIONS) {
    s.checks.forEach((c, i) => {
      const x = q.checks[checkKey(s.id, i)];
      if (!x || !x.r) out.push(`${s.title}: ${c}`);
      else if (x.r === "Fail" && !x.note.trim()) out.push(`${s.title}: ${c} — describe the issue and corrective action`);
    });
    if ((q.photos[s.id] ?? []).length === 0) out.push(`${s.title}: ${s.photo} (add at least one photo)`);
    else if ((q.photos[s.id] ?? []).some((id) => !q.photoMeta?.[id]?.label.trim())) out.push(`${s.title}: every photo must be labelled`);
    if (!(q.notes[s.id] ?? "").trim()) out.push(`${s.title}: ${s.notes} (enter "Nil" if none)`);
  }
  if (!q.tl.name.trim()) out.push("Team Leader sign-off: name");
  if (!q.tl.date) out.push("Team Leader sign-off: date");
  if (!q.tl.sig) out.push("Team Leader sign-off: signature");
  return out;
}

export function itemStatus(it: ComItem): { label: "Not started" | "In progress" | "Complete"; pct: number; fails: number } {
  const q = it.qa;
  let done = 0;
  let fails = 0;
  for (const s of COM_SECTIONS) {
    s.checks.forEach((_, i) => {
      const x = q.checks[checkKey(s.id, i)];
      if (x?.r) done++;
      if (x?.r === "Fail") fails++;
    });
    if ((q.photos[s.id] ?? []).length) done++;
    if ((q.notes[s.id] ?? "").trim()) done++;
  }
  if (q.tl.name.trim()) done++;
  if (q.tl.date) done++;
  if (q.tl.sig) done++;
  const pct = Math.round((done / itemTotal()) * 100);
  return { label: done === 0 ? "Not started" : itemProblems(it).length === 0 ? "Complete" : "In progress", pct, fails };
}

export const itemName = (it: ComItem, i: number) => {
  const n = it.n.trim();
  const c = it.code.trim();
  return n || c ? `ITEM ${n || "?"}${c ? `: ${c}` : ""}` : `Item ${i + 1} (not named yet)`;
};
