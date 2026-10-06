// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
//
// Reads a supplier schedule PDF (Altherm-style "Item N: … Frame Type: … Trim Size: …" quote schedules)
// and returns one entry per item, so a QA check sheet can be built from it. Text-only — no AI service involved.
import { extractText, getDocumentProxy } from "unpdf";

export interface ScheduleItem {
  n: number;
  code: string; // window code, e.g. "2A.200.W01" ("" if the schedule doesn't give one)
  frame: string; // e.g. "Flushglaze 150mm seismic"
  size: string; // trim size, e.g. "3750 x 3000"
}

const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_, a, b) => a + b.toUpperCase()).replace(/\bSd\b/g, "SD").replace(/\bMm\b/g, "mm");
const tidyFrame = (s: string) => titleCase(s.replace(/\s+OUTER FRAME\s*$/i, "").replace(/\s+/g, " ").trim());
// Window codes look like 2A.200.W01 / 2A.100W.12 / 2A.200.W07, W08 & W09
const CODE = /^\d[A-Z]?\.\d{2,4}[A-Z]?\.\s*[A-Z]?\d{1,3}\b/;

/** Pure text → items (exported so it can be tested without a PDF). */
export function parseScheduleText(text: string): ScheduleItem[] {
  const parts = text.split(/\bItem\s+(\d{1,3})\s*:/);
  const out: ScheduleItem[] = [];
  // parts = [preamble, n1, block1, n2, block2, …]
  for (let i = 1; i < parts.length; i += 2) {
    const n = Number(parts[i]);
    const block = parts[i + 1] ?? "";
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const ftIdx = lines.findIndex((l) => /^Frame Type\s*:/i.test(l));
    const frame = ftIdx >= 0 ? tidyFrame(lines[ftIdx].replace(/^Frame Type\s*:/i, "")) : "";
    const size = (block.match(/(\d{3,5})\s*x\s*(\d{3,5})/i) ?? []).slice(1).join(" x ");
    // the code is the first code-shaped line after the Frame Type line; grouped items continue on the next line(s)
    let code = "";
    if (ftIdx >= 0) {
      for (let j = ftIdx + 1; j < Math.min(lines.length, ftIdx + 6); j++) {
        if (CODE.test(lines[j])) {
          code = lines[j];
          while (j + 1 < lines.length && /^(&|,|and\b|W\d|[A-Z]\d{1,3}\b)/i.test(lines[j + 1]) && !/hardware|glass|urbo/i.test(lines[j + 1])) code += " " + lines[++j];
          break;
        }
      }
    }
    code = code.replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ").replace(/\s*&\s*/g, " & ").replace(/\.\s+/g, ".").trim();
    if (!Number.isFinite(n) || (!frame && !size && !code)) continue;
    if (out.some((x) => x.n === n)) continue; // a repeated heading on a later page
    out.push({ n, code, frame, size });
  }
  return out.sort((a, b) => a.n - b.n);
}

export async function parseSchedulePdf(buf: Buffer | Uint8Array): Promise<ScheduleItem[]> {
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  return parseScheduleText(Array.isArray(text) ? text.join("\n") : text);
}

/** "2A.200.W01 — Flushglaze 150mm seismic — 3750 x 3000" style description of where/what the item is. */
export const describeItem = (it: ScheduleItem) => [it.frame, it.size].filter(Boolean).join(" — ");
