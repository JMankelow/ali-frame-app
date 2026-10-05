// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import "server-only";
import { prisma } from "@/lib/prisma";

export interface CashflowSettings {
  openingDate: string; // YYYY-MM-DD — date of the actual bank balance below
  openingBalance: number;
  limitTemporary: number;
  limitTemporaryUntil: string; // temporary limit applies up to and including this date
  limitNormal: number;
  warningBuffer: number;
  forecastStart: string;
}

const DEFAULTS: CashflowSettings = {
  openingDate: "2026-09-25",
  openingBalance: -176516.09,
  limitTemporary: 300000,
  limitTemporaryUntil: "2026-10-21",
  limitNormal: 200000,
  warningBuffer: 20000,
  forecastStart: "2026-09-28",
};

export async function getCashflowSettings(): Promise<{ settings: CashflowSettings; raw: Record<string, string> }> {
  const rows = await prisma.cashflowSetting.findMany();
  const raw = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const n = (k: keyof CashflowSettings) => (raw[k] != null && raw[k] !== "" && !Number.isNaN(Number(raw[k])) ? Number(raw[k]) : (DEFAULTS[k] as number));
  const s = (k: keyof CashflowSettings) => raw[k] || (DEFAULTS[k] as string);
  return {
    raw,
    settings: {
      openingDate: s("openingDate"),
      openingBalance: n("openingBalance"),
      limitTemporary: n("limitTemporary"),
      limitTemporaryUntil: s("limitTemporaryUntil"),
      limitNormal: n("limitNormal"),
      warningBuffer: n("warningBuffer"),
      forecastStart: s("forecastStart"),
    },
  };
}

export const ymd = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => ymd(new Date(new Date(`${iso}T12:00:00Z`).getTime() + n * 86400000));

export interface DayRow {
  date: string; // YYYY-MM-DD
  weekday: string;
  moneyIn: number;
  moneyOut: number;
  net: number;
  closing: number;
  limit: number;
  headroom: number;
  status: "OK" | "Tight" | "Over";
  lines: { details: string; debit: number; credit: number }[];
}

const money1k = (n: number) => `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;

/** "OUT Wages 27.5k; IN Paula 14k" — the one-line summary of what happens on a day, biggest first. */
export function describeDay(lines: DayRow["lines"]): string {
  return lines
    .flatMap((l) => [
      ...(l.debit ? [{ t: `OUT ${l.details} ${money1k(l.debit)}`, v: l.debit, out: 1 }] : []),
      ...(l.credit ? [{ t: `IN ${l.details} ${money1k(l.credit)}`, v: l.credit, out: 0 }] : []),
    ])
    .sort((a, b) => b.out - a.out || b.v - a.v)
    .map((x) => x.t)
    .join("; ");
}

export interface Forecast {
  days: DayRow[];
  entries: { id: string; date: string; details: string; debit: number; credit: number; category: string | null; notes: string | null; done: boolean; source: string }[];
  runningById: Map<string, number>;
  startIndex: number;
}

/** Day-by-day closing bank balance from the opening balance, through the last dated line (at least to the end of the forecast year). */
export async function buildForecast(settings: CashflowSettings): Promise<Forecast> {
  const all = await prisma.cashflowEntry.findMany({ orderBy: [{ date: "asc" }, { createdAt: "asc" }] });
  const entries = all.map((e) => ({ id: e.id, date: ymd(e.date), details: e.details, debit: e.debit, credit: e.credit, category: e.category, notes: e.notes, done: e.done, source: e.source }));

  const byDate = new Map<string, typeof entries>();
  for (const e of entries) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);

  const last = entries.length ? entries[entries.length - 1].date : settings.forecastStart;
  const end = last > "2027-09-30" ? last : "2027-09-30";

  const days: DayRow[] = [];
  const runningById = new Map<string, number>();
  let balance = settings.openingBalance;
  let startIndex = 0;
  for (let d = addDays(settings.openingDate, 1); d <= end; d = addDays(d, 1)) {
    const lines = byDate.get(d) ?? [];
    let moneyIn = 0;
    let moneyOut = 0;
    for (const l of lines) {
      moneyIn += l.credit;
      moneyOut += l.debit;
      balance += l.credit - l.debit;
      runningById.set(l.id, balance);
    }
    const limit = d <= settings.limitTemporaryUntil ? settings.limitTemporary : settings.limitNormal;
    const headroom = limit + balance;
    days.push({
      date: d,
      weekday: new Date(`${d}T12:00:00Z`).toLocaleDateString("en-NZ", { weekday: "short", timeZone: "UTC" }),
      moneyIn,
      moneyOut,
      net: moneyIn - moneyOut,
      closing: balance,
      limit,
      headroom,
      status: headroom < 0 ? "Over" : headroom < settings.warningBuffer ? "Tight" : "OK",
      lines: lines.map((l) => ({ details: l.details, debit: l.debit, credit: l.credit })),
    });
    if (d < settings.forecastStart) startIndex = days.length;
  }
  return { days, entries, runningById, startIndex };
}
