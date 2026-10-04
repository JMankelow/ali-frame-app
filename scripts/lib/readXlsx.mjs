// Minimal .xlsx reader for one-off import scripts (no `xlsx` package — it carries known advisories).
// Uses fflate (already installed) to unzip, then parses sharedStrings + the sheet XML.
// readSheet(path, { sheet: 1 }) -> { headers: string[], rows: Record<string, string|number|null>[] }
import { readFileSync } from "fs";
import { unzipSync, strFromU8 } from "fflate";

const decode = (s) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&amp;/g, "&");

function colIndex(ref) {
  const letters = ref.match(/^[A-Z]+/)[0];
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export function readSheet(path, { sheet = 1, headerRow = 0 } = {}) {
  const files = unzipSync(new Uint8Array(readFileSync(path)));
  const text = (name) => (files[name] ? strFromU8(files[name]) : null);

  const strings = [];
  const ss = text("xl/sharedStrings.xml");
  if (ss) {
    for (const m of ss.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      strings.push(decode([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")));
    }
  }

  const xml = text(`xl/worksheets/sheet${sheet}.xml`);
  if (!xml) throw new Error(`Sheet ${sheet} not found in ${path}`);

  const grid = [];
  for (const rowM of xml.matchAll(/<row [^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const row = [];
    for (const c of (rowM[1] ?? "").matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1];
      const ref = attrs.match(/r="([A-Z]+\d+)"/)?.[1];
      if (!ref) continue;
      const type = attrs.match(/t="([^"]+)"/)?.[1];
      const body = c[2] ?? "";
      let v = null;
      const raw = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      if (type === "s" && raw != null) v = strings[+raw] ?? null;
      else if (type === "inlineStr") v = decode([...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(""));
      else if (type === "str") v = raw != null ? decode(raw) : null;
      else if (raw != null) v = type === "b" ? raw === "1" : Number.isNaN(Number(raw)) ? decode(raw) : Number(raw);
      row[colIndex(ref)] = v;
    }
    grid.push(row);
  }

  const nonEmpty = grid.filter((r) => r.some((v) => v != null && String(v).trim() !== ""));
  const headers = (nonEmpty[headerRow] ?? []).map((h) => (h == null ? "" : String(h).trim()));
  const rows = nonEmpty.slice(headerRow + 1).map((r) => {
    const o = {};
    headers.forEach((h, i) => {
      if (h) o[h] = r[i] == null || (typeof r[i] === "string" && r[i].trim() === "") ? null : r[i];
    });
    return o;
  });
  return { headers, rows };
}

/** Excel serial date -> JS Date (UTC midday, to avoid timezone day-shift). */
export function excelDate(serial) {
  if (typeof serial !== "number") return null;
  return new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000 + 12 * 3600000);
}
