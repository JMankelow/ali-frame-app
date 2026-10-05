// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { INCIDENT_SPEC, type Cond, type IncField, type IncSection } from "@/lib/incidentSpec";

export type Row = { [k: string]: string };
export type Answers = Record<string, string | string[] | Row[] | undefined>;

// ---------- rules (same as the form prototype) ----------

const list = (v: unknown): string[] => (Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === "string") : v ? [String(v)] : []);

export function cond(c: Cond | undefined, a: Answers): boolean {
  if (!c) return true;
  const v = a[c.field];
  const l = list(v);
  if (c.equals !== undefined) return v === c.equals;
  if (c.in) return l.some((x) => c.in!.includes(x));
  if (c.not_in) return l.length === 0 ? true : l.some((x) => !c.not_in!.includes(x));
  return true;
}
export const isRequired = (f: IncField, a: Answers) => !!f.required || (f.required_if ? cond(f.required_if, a) : false);
export const isEmpty = (v: unknown) => v == null || v === "" || (Array.isArray(v) && v.length === 0);
export const fieldVisible = (f: IncField, s: IncSection, a: Answers) => cond(f.show_if, a) && cond(s.show_if, a);

/** Drops hidden answers and returns what's still missing — used on the form and again on the server. */
export function validateIncident(answers: Answers): { clean: Answers; problems: { id: string; label: string }[] } {
  const clean: Answers = {};
  const problems: { id: string; label: string }[] = [];
  for (const s of INCIDENT_SPEC.sections) {
    if (!cond(s.show_if, answers)) continue;
    for (const f of s.fields) {
      if (f.type === "notice" || !fieldVisible(f, s, answers)) continue;
      const v = answers[f.id];
      if (!isEmpty(v)) clean[f.id] = v;
      if (isRequired(f, answers) && isEmpty(v)) problems.push({ id: f.id, label: f.label ?? f.id });
      if (f.type === "repeater" && Array.isArray(v)) {
        (v as Row[]).forEach((row, i) => {
          for (const c of f.columns ?? []) if (c.required && isEmpty(row[c.id])) problems.push({ id: `${f.id}.${i}.${c.id}`, label: `${f.label} — row ${i + 1}: ${c.label}` });
        });
      }
    }
  }
  return { clean, problems };
}

// ---------- body map ----------

type BodyShape = "ellipse" | "rect";
// x coordinates are for a 200-wide figure; "sided" parts are given for screen-left and mirrored for screen-right.
const BODY: [string, BodyShape, Record<string, number>, boolean][] = [
  ["head", "ellipse", { cx: 100, cy: 38, rx: 24, ry: 28 }, false],
  ["neck", "rect", { x: 89, y: 64, width: 22, height: 18, rx: 6 }, false],
  ["shoulder", "rect", { x: 48, y: 82, width: 26, height: 30, rx: 12 }, true],
  ["torso_upper", "rect", { x: 74, y: 82, width: 52, height: 62, rx: 8 }, false],
  ["torso_lower", "rect", { x: 76, y: 144, width: 48, height: 50, rx: 8 }, false],
  ["upper_arm", "rect", { x: 42, y: 112, width: 22, height: 56, rx: 10 }, true],
  ["forearm", "rect", { x: 36, y: 168, width: 20, height: 58, rx: 9 }, true],
  ["hand", "ellipse", { cx: 44, cy: 242, rx: 12, ry: 16 }, true],
  ["pelvis", "rect", { x: 74, y: 194, width: 52, height: 32, rx: 10 }, false],
  ["thigh", "rect", { x: 74, y: 226, width: 25, height: 74, rx: 10 }, true],
  ["knee", "rect", { x: 75, y: 300, width: 23, height: 22, rx: 9 }, true],
  ["lower_leg", "rect", { x: 76, y: 322, width: 21, height: 62, rx: 9 }, true],
  ["foot", "ellipse", { cx: 85, cy: 394, rx: 15, ry: 9 }, true],
];
const NAMES: Record<string, string> = {
  head: "Head", face: "Face", neck: "Neck", shoulder: "shoulder", chest: "Chest", upper_back: "Upper back", abdomen: "Abdomen", lower_back: "Lower back",
  upper_arm: "upper arm", forearm: "forearm", hand: "hand", hip_groin: "Hip / groin", buttocks: "Buttocks", thigh: "thigh", knee: "knee", lower_leg: "lower leg", foot: "foot",
};
function regionName(view: "front" | "back", base: string) {
  if (base === "head") return view === "front" ? "face" : "head";
  if (base === "torso_upper") return view === "front" ? "chest" : "upper_back";
  if (base === "torso_lower") return view === "front" ? "abdomen" : "lower_back";
  if (base === "pelvis") return view === "front" ? "hip_groin" : "buttocks";
  return base;
}
export function regionLabel(id: string): string {
  const [view, region, side] = id.split(".");
  const n = NAMES[region] ?? region;
  return `${side ? `${side[0].toUpperCase()}${side.slice(1)} ${n}` : n} (${view})`;
}
const mirror = (a: Record<string, number>) => {
  const o = { ...a };
  if ("cx" in o) o.cx = 200 - o.cx;
  if ("x" in o) o.x = 200 - o.x - o.width;
  return o;
};
/** Every clickable region of one figure with its id and shape. Left/right are always the injured person's own. */
export function bodyRegions(view: "front" | "back"): { id: string; shape: BodyShape; attrs: Record<string, number> }[] {
  const leftSide = view === "front" ? "right" : "left"; // screen-left on the front view is the person's right
  const rightSide = view === "front" ? "left" : "right";
  const out: { id: string; shape: BodyShape; attrs: Record<string, number> }[] = [];
  for (const [base, shape, attrs, sided] of BODY) {
    const r = regionName(view, base);
    if (sided) {
      out.push({ id: `${view}.${r}.${leftSide}`, shape, attrs });
      out.push({ id: `${view}.${r}.${rightSide}`, shape, attrs: mirror(attrs) });
    } else out.push({ id: `${view}.${r}`, shape, attrs });
  }
  return out;
}

/** How serious the answers say it was — used to open the linked incident and decide who gets told. */
export function severityOf(outcome: string): "Low" | "Medium" | "High" {
  if (outcome === "Serious harm / notifiable event" || outcome === "Hospital") return "High";
  if (outcome === "Doctor" || outcome === "First aid") return "Medium";
  return "Low";
}
