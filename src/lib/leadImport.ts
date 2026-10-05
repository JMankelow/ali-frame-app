// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import "server-only";
import { unzipSync, strFromU8 } from "fflate";
import { JOB_LEAD_SOURCES } from "@/lib/jobStatus";

/** One lead read from an uploaded file, ready to be reviewed and imported. */
export interface ParsedLead {
  title: string;
  source: string;
  description: string;
}

export const MAX_LEAD_FILE_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 500;

// ---------- helpers ----------

const clean = (v: unknown) => (v == null ? "" : String(v).replace(/\s+/g, " ").trim());

/** Maps whatever the file says ("google", "word of mouth") onto our standard list; keeps unknown text as typed. */
function canonicalSource(raw: string, fallback: string): string {
  const s = clean(raw);
  if (!s) return fallback;
  const hit = JOB_LEAD_SOURCES.find((o) => o.toLowerCase() === s.toLowerCase());
  if (hit) return hit;
  const l = s.toLowerCase();
  if (l.includes("google") || l.includes("search")) return "Web Search - Google Ads";
  if (l.includes("facebook") || l.includes("instagram") || l.includes("social")) return "Social Media";
  if (l.includes("website") || l.includes("web form") || l.includes("online")) return "Website";
  if (l.includes("word") || l.includes("friend") || l.includes("refer")) return "Word of Mouth";
  if (l.includes("email")) return "Email Enquiry";
  if (l.includes("phone") || l.includes("call")) return "Phone Call";
  return s.slice(0, 80);
}

// ---------- CSV ----------

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
  const t = text.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (inQ) {
      if (ch === '"') {
        if (t[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === "," || ch === ";" || ch === "\t") { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      row.push(cur); rows.push(row); row = []; cur = "";
    } else cur += ch;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// ---------- XLSX (first sheet) ----------

const xmlDecode = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&amp;/g, "&");

function colIndex(ref: string): number {
  let n = 0;
  for (const ch of ref.match(/^[A-Z]+/)![0]) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function parseXlsx(buf: Uint8Array): string[][] {
  const wanted = (name: string) => name === "xl/sharedStrings.xml" || name === "xl/worksheets/sheet1.xml";
  const files = unzipSync(buf, { filter: (f) => wanted(f.name) && f.originalSize < 20_000_000 });
  const sheet = files["xl/worksheets/sheet1.xml"];
  if (!sheet) throw new Error("Couldn't find the first sheet in that Excel file.");
  const strings: string[] = [];
  if (files["xl/sharedStrings.xml"]) {
    for (const m of strFromU8(files["xl/sharedStrings.xml"]).matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      strings.push(xmlDecode([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")));
    }
  }
  const grid: string[][] = [];
  for (const rowM of strFromU8(sheet).matchAll(/<row [^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const row: string[] = [];
    for (const c of (rowM[1] ?? "").matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = c[1].match(/r="([A-Z]+\d+)"/)?.[1];
      if (!ref) continue;
      const type = c[1].match(/t="([^"]+)"/)?.[1];
      const body = c[2] ?? "";
      const raw = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let v = "";
      if (type === "s" && raw != null) v = strings[+raw] ?? "";
      else if (type === "inlineStr") v = xmlDecode([...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(""));
      else if (raw != null) v = xmlDecode(raw);
      row[colIndex(ref)] = v;
    }
    grid.push(Array.from(row, (x) => x ?? ""));
  }
  return grid.filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
}

// ---------- table -> leads ----------

const FIELD_ALIASES: Record<string, string[]> = {
  title: ["title", "subject", "enquiry", "lead", "lead title", "job", "project"],
  name: ["name", "customer", "customer name", "client", "client name", "full name", "contact", "contact name"],
  first: ["first name", "firstname", "first"],
  last: ["last name", "lastname", "surname", "last"],
  email: ["email", "email address", "e-mail"],
  phone: ["phone", "mobile", "phone number", "mobile number", "telephone", "contact number"],
  address: ["address", "site address", "property address", "suburb", "location"],
  source: ["source", "lead source", "how did you hear about us", "heard about us", "how did they hear about us", "referral source"],
  message: ["description", "message", "notes", "details", "enquiry details", "comments", "enquiry message", "what are you looking for"],
  date: ["date", "received", "date received", "created"],
};

function tableToLeads(grid: string[][]): ParsedLead[] {
  if (grid.length < 2) return [];
  const headers = grid[0].map((h) => clean(h).toLowerCase());
  const col = (field: string) => headers.findIndex((h) => FIELD_ALIASES[field].includes(h));
  const idx = Object.fromEntries(Object.keys(FIELD_ALIASES).map((f) => [f, col(f)])) as Record<string, number>;
  if (Object.values(idx).every((i) => i < 0)) {
    throw new Error("I couldn't recognise the column headings. Use headings like Name, Email, Phone, Address, Source, Message (first row).");
  }
  const get = (r: string[], f: string) => (idx[f] >= 0 ? clean(r[idx[f]]) : "");

  const out: ParsedLead[] = [];
  for (const r of grid.slice(1)) {
    const name = get(r, "name") || [get(r, "first"), get(r, "last")].filter(Boolean).join(" ");
    const address = get(r, "address");
    const title = get(r, "title") || [name, address].filter(Boolean).join(" — ");
    if (!title) continue;
    const lines = [
      name && `Contact: ${name}`,
      get(r, "email") && `Email: ${get(r, "email")}`,
      get(r, "phone") && `Phone: ${get(r, "phone")}`,
      address && `Address: ${address}`,
      get(r, "date") && `Received: ${get(r, "date")}`,
      get(r, "message") && `\n${get(r, "message")}`,
    ].filter(Boolean) as string[];
    out.push({ title: title.slice(0, 160), source: canonicalSource(get(r, "source"), ""), description: lines.join("\n").slice(0, 4000) });
    if (out.length >= MAX_ROWS) break;
  }
  return out;
}

// ---------- .eml (a saved email) ----------

function decodeQuotedPrintable(s: string, charset = "utf-8"): string {
  const bytes: number[] = [];
  const t = s.replace(/=\r?\n/g, "");
  for (let i = 0; i < t.length; i++) {
    if (t[i] === "=" && /^[0-9A-Fa-f]{2}$/.test(t.slice(i + 1, i + 3))) { bytes.push(parseInt(t.slice(i + 1, i + 3), 16)); i += 2; }
    else bytes.push(...Buffer.from(t[i], "utf8"));
  }
  try { return new TextDecoder(charset).decode(Uint8Array.from(bytes)); } catch { return Buffer.from(bytes).toString("utf8"); }
}

function decodeBody(body: string, encoding: string, charset: string): string {
  const enc = encoding.toLowerCase();
  if (enc === "base64") { try { return new TextDecoder(charset).decode(Buffer.from(body.replace(/\s+/g, ""), "base64")); } catch { return ""; } }
  if (enc === "quoted-printable") return decodeQuotedPrintable(body, charset);
  return body;
}

function decodeHeaderWords(v: string): string {
  return v.replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (_m, cs: string, e: string, txt: string) => {
    try {
      if (e.toLowerCase() === "b") return new TextDecoder(cs).decode(Buffer.from(txt, "base64"));
      return decodeQuotedPrintable(txt.replace(/_/g, " "), cs);
    } catch { return txt; }
  });
}

function splitHeaders(raw: string): { headers: Record<string, string>; body: string } {
  const m = raw.match(/\r?\n\r?\n/);
  const head = m ? raw.slice(0, m.index) : raw;
  const body = m ? raw.slice((m.index ?? 0) + m[0].length) : "";
  const headers: Record<string, string> = {};
  for (const line of head.replace(/\r?\n[ \t]+/g, " ").split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) headers[line.slice(0, i).trim().toLowerCase()] = decodeHeaderWords(line.slice(i + 1).trim());
  }
  return { headers, body };
}

function textFromPart(raw: string): { text: string; html: boolean } | null {
  const { headers, body } = splitHeaders(raw);
  const ct = headers["content-type"] ?? "text/plain";
  const boundary = ct.match(/boundary="?([^";]+)"?/i)?.[1];
  if (/multipart\//i.test(ct) && boundary) {
    const parts = body.split(`--${boundary}`).slice(1).filter((p) => !p.startsWith("--"));
    const results = parts.map((p) => textFromPart(p.replace(/^\r?\n/, ""))).filter(Boolean) as { text: string; html: boolean }[];
    return results.find((r) => !r.html) ?? results[0] ?? null;
  }
  if (!/text\/(plain|html)/i.test(ct)) return null;
  const charset = ct.match(/charset="?([^";]+)"?/i)?.[1] ?? "utf-8";
  const decoded = decodeBody(body, headers["content-transfer-encoding"] ?? "7bit", charset);
  const html = /text\/html/i.test(ct);
  return { text: html ? decoded.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<br\s*\/?>|<\/p>|<\/div>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&") : decoded, html };
}

function parseEml(text: string): ParsedLead[] {
  const { headers } = splitHeaders(text);
  const part = textFromPart(text);
  const body = (part?.text ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).join("\n").slice(0, 3000);
  const from = headers["from"] ?? "";
  const subject = headers["subject"] ?? "";
  if (!subject && !body) throw new Error("That doesn't look like a saved email (.eml).");
  const fromName = from.replace(/<[^>]*>/g, "").replace(/["']/g, "").trim();
  const fromEmail = from.match(/<([^>]+)>/)?.[1] ?? (from.includes("@") ? from : "");
  const lines = [
    fromName && `Contact: ${fromName}`,
    fromEmail && `Email: ${fromEmail}`,
    headers["date"] && `Received: ${headers["date"]}`,
    body && `\n${body}`,
  ].filter(Boolean) as string[];
  return [{ title: (subject || fromName || "Email enquiry").slice(0, 160), source: "Email Enquiry", description: lines.join("\n") }];
}

// ---------- entry point ----------

export function parseLeadFile(fileName: string, bytes: Uint8Array): ParsedLead[] {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  if (ext === "csv") return tableToLeads(parseCsv(new TextDecoder().decode(bytes)));
  if (ext === "xlsx") return tableToLeads(parseXlsx(bytes));
  if (ext === "eml") return parseEml(new TextDecoder("utf-8").decode(bytes));
  if (ext === "msg") throw new Error("Outlook .msg files can't be read here — in Outlook choose File → Save As → save as .eml (or forward the enquiry details into a spreadsheet).");
  if (ext === "xls") throw new Error("Old .xls files aren't supported — open it in Excel and Save As .xlsx or .csv.");
  throw new Error("Upload a .csv, .xlsx or a saved email (.eml).");
}
