// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import Link from "next/link";
import { requireSuperUser } from "@/lib/session";
import { getXeroConnectionStatus } from "@/lib/xero";
import { getBankSummary } from "@/lib/xeroReports";
import { buildForecast, describeDay, getCashflowSettings, type DayRow } from "@/lib/cashflow";
import { deleteCashflowEntry, saveCashflowEntry, saveCashflowSettings, toggleCashflowDone } from "./actions";

const TABS = [
  ["summary", "Summary"],
  ["daily", "Daily Summary"],
  ["key", "Key Dates"],
  ["ledger", "Monthly Ledger"],
  ["pipeline", "Job Pipeline"],
  ["assumptions", "Assumptions"],
  ["settings", "Bank & Limits"],
  ["bank", "Bank (Xero)"],
] as const;

const fmt0 = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-NZ")}`;
const fmt2 = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const nzDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-NZ", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const monthLabel = (m: string) => new Date(`${m}-01T12:00:00Z`).toLocaleDateString("en-NZ", { month: "short", year: "numeric", timeZone: "UTC" });
const STATUS_BG: Record<DayRow["status"], string | undefined> = { OK: undefined, Tight: "#fff4d6", Over: "#fde2e2" };
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function CashflowPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireSuperUser();
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === first(sp.tab)) ? first(sp.tab) : "summary";

  const { settings, raw } = await getCashflowSettings();
  const fc = await buildForecast(settings);
  const days = fc.days.slice(fc.startIndex); // from the forecast start (28 Sep)
  const months: string[] = [];
  for (const d of days) {
    const m = d.date.slice(0, 7);
    if (months[months.length - 1] !== m) months.push(m);
  }
  const todayM = new Date().toISOString().slice(0, 7);
  const monthParam = first(sp.month);
  const month = months.includes(monthParam) ? monthParam : months.includes(todayM) ? todayM : months[0];

  // ---- headline numbers ----
  const lowest = days.reduce((a, b) => (b.closing < a.closing ? b : a), days[0]);
  const over = days.filter((d) => d.status === "Over").length;
  const tight = days.filter((d) => d.status === "Tight").length;
  const totalIn = days.reduce((s, d) => s + d.moneyIn, 0);
  const totalOut = days.reduce((s, d) => s + d.moneyOut, 0);
  const lastDay = days[days.length - 1];

  const pastMonths: { month: string; receipts: number; payments: number }[] = raw.pastMonths ? JSON.parse(raw.pastMonths) : [];
  const lastYear = (m: string) => {
    const [y, mm] = m.split("-").map(Number);
    return pastMonths.find((p) => p.month === `${y - 1}-${String(mm).padStart(2, "0")}`);
  };
  const monthRows = months.map((m) => {
    const ds = days.filter((d) => d.date.startsWith(m));
    return {
      m,
      moneyIn: ds.reduce((s, d) => s + d.moneyIn, 0),
      moneyOut: ds.reduce((s, d) => s + d.moneyOut, 0),
      end: ds[ds.length - 1].closing,
      low: Math.min(...ds.map((d) => d.closing)),
      tightest: Math.min(...ds.map((d) => d.headroom)),
      partial: ds.length < 28,
    };
  });

  const pipeline: { header: string[]; rows: (string | number | null)[][] } | null = raw.pipeline ? JSON.parse(raw.pipeline) : null;
  const assumptions: { input: string; value: string | number | null; note: string }[] = raw.assumptions ? JSON.parse(raw.assumptions) : [];

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Cashflow</h2>
          <div className="subtitle">
            Daily forecast of the bank account against the overdraft limit — edit it every day on the Monthly Ledger tab. DRAFT, PENDING ORGANISATION REVIEW; a forecast, not a guarantee.
          </div>
        </div>
      </div>

      <div className="actions" style={{ marginBottom: 12, flexWrap: "wrap" }}>
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/cashflow?tab=${k}`} className="btn" style={{ background: tab === k ? "#16a34a" : "#f3f4f6", color: tab === k ? "#fff" : "#111827", fontWeight: 700 }}>
            {label}
          </Link>
        ))}
      </div>

      {tab === "summary" && (
        <>
          <div className="cards">
            <div className="card"><div className="label">Bank balance {nzDate(settings.openingDate)}</div><div className="metric">{fmt0(settings.openingBalance)}</div><div className="hint">Headroom {fmt0(settings.limitTemporary + settings.openingBalance)} on the {fmt0(settings.limitTemporary)} limit</div></div>
            <div className="card"><div className="label">Lowest daily balance</div><div className="metric">{fmt0(lowest.closing)}</div><div className="hint">{lowest.weekday} {nzDate(lowest.date)}</div></div>
            <div className="card"><div className="label">Days over the limit</div><div className="metric" style={{ color: over ? "#dc2626" : undefined }}>{over}</div><div className="hint">{tight} more within {fmt0(settings.warningBuffer)} of it</div></div>
            <div className="card"><div className="label">Balance {nzDate(lastDay.date)}</div><div className="metric">{fmt0(lastDay.closing)}</div></div>
          </div>
          <div className="cards" style={{ marginTop: 12 }}>
            <div className="card"><div className="label">Total money in</div><div className="metric">{fmt0(totalIn)}</div><div className="hint">{nzDate(days[0].date)} – {nzDate(lastDay.date)}, incl GST</div></div>
            <div className="card"><div className="label">Total money out</div><div className="metric">{fmt0(totalOut)}</div></div>
            <div className="card"><div className="label">Net</div><div className="metric">{fmt0(totalIn - totalOut)}</div></div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div className="label">Bank balance against the overdraft limit</div>
            <BalanceChart days={days} />
          </div>

          <div className="card" style={{ marginTop: 12, overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Month</th><th style={{ textAlign: "right" }}>Money in</th><th style={{ textAlign: "right" }}>Money out</th><th style={{ textAlign: "right" }}>Net</th>
                  <th style={{ textAlign: "right" }}>Month-end balance</th><th style={{ textAlign: "right" }}>Lowest daily balance</th><th style={{ textAlign: "right" }}>Tightest headroom</th>
                  <th style={{ textAlign: "right" }}>Last year: in</th><th style={{ textAlign: "right" }}>Last year: out</th>
                </tr>
              </thead>
              <tbody>
                {monthRows.map((r) => {
                  const ly = lastYear(r.m);
                  return (
                    <tr key={r.m}>
                      <td><Link href={`/cashflow?tab=ledger&month=${r.m}`} style={{ fontWeight: 700, color: "var(--blueDark)", textDecoration: "none" }}>{monthLabel(r.m)}{r.partial ? " (part)" : ""}</Link></td>
                      <td style={{ textAlign: "right" }}>{fmt0(r.moneyIn)}</td>
                      <td style={{ textAlign: "right" }}>{fmt0(r.moneyOut)}</td>
                      <td style={{ textAlign: "right", color: r.moneyIn - r.moneyOut < 0 ? "#dc2626" : undefined }}>{fmt0(r.moneyIn - r.moneyOut)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt0(r.end)}</td>
                      <td style={{ textAlign: "right" }}>{fmt0(r.low)}</td>
                      <td style={{ textAlign: "right", color: r.tightest < 0 ? "#dc2626" : r.tightest < settings.warningBuffer ? "#b45309" : undefined }}>{fmt0(r.tightest)}</td>
                      <td style={{ textAlign: "right" }} className="hint">{ly ? fmt0(ly.receipts) : "—"}</td>
                      <td style={{ textAlign: "right" }} className="hint">{ly ? fmt0(ly.payments) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="hint" style={{ marginTop: 8 }}>
              Last year = the same month a year earlier from the ledger (Nov 2025 includes a $348,200 loan drawdown and a $79,450.50 Prospa payout). All figures include GST.
            </div>
          </div>
        </>
      )}

      {tab === "daily" && (
        <>
          <MonthPills months={months} current={month} tab="daily" />
          <div className="hint" style={{ marginBottom: 8 }}>Red = over the limit; amber = within {fmt0(settings.warningBuffer)} of it.</div>
          <div className="card" style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr><th>Date</th><th>Day</th><th style={{ textAlign: "right" }}>In</th><th style={{ textAlign: "right" }}>Out</th><th style={{ textAlign: "right" }}>Net</th><th style={{ textAlign: "right" }}>Closing balance</th><th style={{ textAlign: "right" }}>Headroom</th><th>Status</th><th>What is happening</th></tr>
              </thead>
              <tbody>
                {days.filter((d) => d.date.startsWith(month)).map((d) => (
                  <tr key={d.date} style={{ background: STATUS_BG[d.status] }}>
                    <td>{nzDate(d.date)}</td><td>{d.weekday}</td>
                    <td style={{ textAlign: "right" }}>{d.moneyIn ? fmt0(d.moneyIn) : ""}</td>
                    <td style={{ textAlign: "right" }}>{d.moneyOut ? fmt0(d.moneyOut) : ""}</td>
                    <td style={{ textAlign: "right" }}>{d.net ? fmt0(d.net) : ""}</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt0(d.closing)}</td>
                    <td style={{ textAlign: "right" }}>{fmt0(d.headroom)}</td>
                    <td>{d.status}</td>
                    <td className="hint" style={{ maxWidth: 520 }}>{describeDay(d.lines)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "key" && (
        <div className="card" style={{ overflowX: "auto" }}>
          <div className="hint" style={{ marginBottom: 8 }}>Every day where $20,000 or more goes out, with the balance at the end of that day.</div>
          <table>
            <thead><tr><th>Date</th><th>Day</th><th>Going out that day</th><th style={{ textAlign: "right" }}>Money out</th><th style={{ textAlign: "right" }}>Balance at end of day</th><th style={{ textAlign: "right" }}>Headroom</th></tr></thead>
            <tbody>
              {days.filter((d) => d.moneyOut >= 20000).map((d) => (
                <tr key={d.date} style={{ background: STATUS_BG[d.status] }}>
                  <td>{nzDate(d.date)}</td><td>{d.weekday}</td>
                  <td className="hint">{describeDay(d.lines.filter((l) => l.debit))}</td>
                  <td style={{ textAlign: "right" }}>{fmt0(d.moneyOut)}</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt0(d.closing)}</td>
                  <td style={{ textAlign: "right" }}>{fmt0(d.headroom)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "ledger" && (
        <>
          <MonthPills months={months} current={month} tab="ledger" />
          <div className="hint" style={{ marginBottom: 8 }}>
            Money in or out that isn&apos;t listed: add it below. A payment moves: change its date. An amount changes: edit it. Tick ✓ once it has actually happened. Delete lines that are no longer expected. Everything recalculates.
          </div>
          <div className="card" style={{ overflowX: "auto" }}>
            <table>
              <thead><tr><th>Date</th><th>Details</th><th>Debit (out)</th><th>Credit (in)</th><th style={{ textAlign: "right" }}>Balance</th><th>Category</th><th>Notes</th><th></th></tr></thead>
              <tbody>
                <tr style={{ background: "#fff9db" }}>
                  <td colSpan={8}>
                    <form action={saveCashflowEntry} className="actions" style={{ flexWrap: "wrap" }}>
                      <input type="hidden" name="month" value={month} />
                      <b>Add a line:</b>
                      <input type="date" name="date" defaultValue={`${month}-01`} required />
                      <input name="details" placeholder="Details" required style={{ minWidth: 220 }} />
                      <input name="debit" placeholder="Debit (out)" inputMode="decimal" style={{ width: 110 }} />
                      <input name="credit" placeholder="Credit (in)" inputMode="decimal" style={{ width: 110 }} />
                      <input name="category" placeholder="Category" style={{ width: 130 }} />
                      <input name="notes" placeholder="Notes" style={{ minWidth: 160 }} />
                      <button type="submit" className="btn primary">Add</button>
                    </form>
                  </td>
                </tr>
                {fc.entries.filter((e) => e.date.startsWith(month)).map((e) => (
                  <tr key={e.id} style={{ opacity: e.done ? 0.6 : 1 }}>
                    <td colSpan={4} style={{ padding: 0 }}>
                      <form id={`f-${e.id}`} action={saveCashflowEntry} style={{ display: "grid", gridTemplateColumns: "130px minmax(180px,1fr) 110px 110px", gap: 6, padding: "4px 8px", alignItems: "center" }}>
                        <input type="hidden" name="id" value={e.id} />
                        <input type="hidden" name="month" value={month} />
                        <input type="date" name="date" defaultValue={e.date} required />
                        <input name="details" defaultValue={e.details} required />
                        <input name="debit" defaultValue={e.debit || ""} inputMode="decimal" />
                        <input name="credit" defaultValue={e.credit || ""} inputMode="decimal" />
                      </form>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt2(fc.runningById.get(e.id) ?? 0)}</td>
                    <td><input form={`f-${e.id}`} name="category" defaultValue={e.category ?? ""} style={{ width: 120 }} /></td>
                    <td><input form={`f-${e.id}`} name="notes" defaultValue={e.notes ?? ""} style={{ minWidth: 160 }} /></td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button form={`f-${e.id}`} type="submit" className="btn light">Save</button>{" "}
                      <button form={`f-${e.id}`} formAction={toggleCashflowDone} type="submit" className="btn light" title="Mark as having happened">{e.done ? "✓ Done" : "Done?"}</button>{" "}
                      <button form={`f-${e.id}`} formAction={deleteCashflowEntry} type="submit" className="btn light">Delete</button>
                    </td>
                  </tr>
                ))}
                {fc.entries.filter((e) => e.date.startsWith(month)).length === 0 && <tr><td colSpan={8} className="hint">No lines this month yet.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="hint" style={{ marginTop: 6 }}>
            {monthLabel(month)}: money in {fmt0(days.filter((d) => d.date.startsWith(month)).reduce((s, d) => s + d.moneyIn, 0))}, money out {fmt0(days.filter((d) => d.date.startsWith(month)).reduce((s, d) => s + d.moneyOut, 0))}.
          </div>
        </>
      )}

      {tab === "pipeline" && (
        <div className="card" style={{ overflowX: "auto" }}>
          <div className="hint" style={{ marginBottom: 8 }}>
            Residential jobs sold but not finished, and when each 40% / 50% / 10% payment is due (snapshot from the Job Tracker, 28 Sep 2026 — values incl GST). The matching dated lines are on the Monthly Ledger.
          </div>
          {!pipeline ? <div className="hint">Not imported.</div> : <PipelineTable pipeline={pipeline} />}
        </div>
      )}

      {tab === "assumptions" && (
        <div className="card" style={{ overflowX: "auto" }}>
          <div className="hint" style={{ marginBottom: 8 }}>The inputs behind the forecast and where each came from (from the workbook, v6). Change the amounts themselves on the Monthly Ledger.</div>
          <table>
            <thead><tr><th>Input</th><th>Value</th><th>Source / note</th></tr></thead>
            <tbody>
              {assumptions.map((a, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: a.value == null ? 800 : undefined }}>{a.input}</td>
                  <td>{a.value == null ? "" : String(a.value)}</td>
                  <td className="hint">{a.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "settings" && (
        <div className="card">
          <div className="label">Roll forward — bank balance and overdraft limit</div>
          <div className="hint" style={{ marginTop: 4 }}>
            To roll forward: enter the actual bank balance and its date, then delete the lines that have now happened. Balances recalculate from this figure.
          </div>
          <form action={saveCashflowSettings} className="form" style={{ marginTop: 10 }}>
            <div><label>Actual bank balance (negative = overdrawn)</label><input name="openingBalance" defaultValue={settings.openingBalance} inputMode="decimal" /></div>
            <div><label>…as at (date)</label><input type="date" name="openingDate" defaultValue={settings.openingDate} /></div>
            <div><label>Forecast starts (first day shown)</label><input type="date" name="forecastStart" defaultValue={settings.forecastStart} /></div>
            <div><label>Temporary overdraft limit ($)</label><input name="limitTemporary" defaultValue={settings.limitTemporary} inputMode="decimal" /></div>
            <div><label>…applies up to and including</label><input type="date" name="limitTemporaryUntil" defaultValue={settings.limitTemporaryUntil} /></div>
            <div><label>Normal overdraft limit ($)</label><input name="limitNormal" defaultValue={settings.limitNormal} inputMode="decimal" /></div>
            <div><label>Warning buffer — flag “Tight” within ($)</label><input name="warningBuffer" defaultValue={settings.warningBuffer} inputMode="decimal" /></div>
            <div className="full actions"><button type="submit" className="btn primary">Save</button></div>
          </form>
        </div>
      )}

      {tab === "bank" && <XeroBank />}
    </div>
  );
}

function MonthPills({ months, current, tab }: { months: string[]; current: string; tab: string }) {
  return (
    <div className="actions" style={{ marginBottom: 10, flexWrap: "wrap" }}>
      {months.map((m) => (
        <Link key={m} href={`/cashflow?tab=${tab}&month=${m}`} className="btn" style={{ background: m === current ? "#111827" : "#f3f4f6", color: m === current ? "#fff" : "#111827", fontWeight: 700 }}>
          {monthLabel(m)}
        </Link>
      ))}
    </div>
  );
}

function BalanceChart({ days }: { days: DayRow[] }) {
  const W = 900;
  const H = 240;
  const pad = { l: 64, r: 10, t: 10, b: 24 };
  const vals = days.flatMap((d) => [d.closing, -d.limit]);
  const max = Math.max(0, ...vals);
  const min = Math.min(...vals);
  const x = (i: number) => pad.l + (i / Math.max(days.length - 1, 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + ((max - v) / (max - min || 1)) * (H - pad.t - pad.b);
  const line = days.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.closing).toFixed(1)}`).join(" ");
  const limit = days.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(-d.limit).toFixed(1)}`).join(" ");
  const ticks = [max, (max + min) / 2, min];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", marginTop: 8 }} role="img" aria-label="Daily closing bank balance against the overdraft limit">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e5e7eb" />
          <text x={pad.l - 6} y={y(t) + 4} fontSize="11" textAnchor="end" fill="#6b7280">{fmt0(t)}</text>
        </g>
      ))}
      <path d={limit} fill="none" stroke="#dc2626" strokeDasharray="5 4" strokeWidth="1.5" />
      <path d={line} fill="none" stroke="#0057b8" strokeWidth="2" />
      {days.map((d, i) => (i % 61 === 0 ? <text key={d.date} x={x(i)} y={H - 6} fontSize="11" fill="#6b7280">{nzDate(d.date).slice(0, 5)}</text> : null))}
      <text x={W - pad.r} y={pad.t + 12} fontSize="11" textAnchor="end" fill="#dc2626">- - overdraft limit</text>
      <text x={W - pad.r} y={pad.t + 26} fontSize="11" textAnchor="end" fill="#0057b8">— closing balance</text>
    </svg>
  );
}

function PipelineTable({ pipeline }: { pipeline: { header: string[]; rows: (string | number | null)[][] } }) {
  const want = ["Status", "Job No", "Client", "Supplier", "Value incl GST", "Install date used", "Deposit due", "Deposit $", "50% due", "50% $", "10% due", "10% $", "Note"];
  const cols = want.map((w) => ({ w, i: pipeline.header.findIndex((h) => h === w) })).filter((c) => c.i >= 0);
  const isDate = (s: string) => /due|date/i.test(s);
  const isMoney = (s: string) => /\$|Value/.test(s);
  const sum = (name: string) => {
    const c = cols.find((x) => x.w === name);
    return c ? pipeline.rows.reduce((s, r) => s + (typeof r[c.i] === "number" ? (r[c.i] as number) : 0), 0) : 0;
  };
  return (
    <table>
      <thead><tr>{cols.map((c) => <th key={c.w} style={{ textAlign: isMoney(c.w) ? "right" : undefined }}>{c.w}</th>)}</tr></thead>
      <tbody>
        {pipeline.rows.map((r, ri) => (
          <tr key={ri}>
            {cols.map((c) => {
              const v = r[c.i];
              return (
                <td key={c.w} style={{ textAlign: isMoney(c.w) ? "right" : undefined }} className={c.w === "Note" ? "hint" : undefined}>
                  {v == null || v === "" ? "" : isDate(c.w) && typeof v === "string" ? nzDate(v) : isMoney(c.w) && typeof v === "number" ? fmt0(v) : String(v)}
                </td>
              );
            })}
          </tr>
        ))}
        <tr style={{ fontWeight: 800 }}>
          {cols.map((c) => (
            <td key={c.w} style={{ textAlign: "right" }}>
              {["Deposit $", "50% $", "10% $"].includes(c.w) ? fmt0(sum(c.w)) : c.w === "Status" ? "Still to collect" : c.w === "Client" ? fmt0(sum("Deposit $") + sum("50% $") + sum("10% $")) : ""}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

async function XeroBank() {
  const connection = await getXeroConnectionStatus();
  if (!connection) {
    return (
      <div className="card">
        <p>Xero isn&apos;t connected yet.</p>
        <div className="actions" style={{ marginTop: 12 }}>
          <Link href="/sync/xero" className="btn primary">Connect Xero</Link>
        </div>
      </div>
    );
  }
  const to = new Date();
  const from = new Date(to);
  from.setMonth(from.getMonth() - 3);
  let report;
  let loadError = "";
  try {
    report = await getBankSummary(from, to);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Could not load the Bank Summary from Xero.";
  }
  return (
    <>
      <div className="hint" style={{ marginBottom: 8 }}>
        Bank Summary, last 3 months ({from.toLocaleDateString("en-NZ")} – {to.toLocaleDateString("en-NZ")}), live from {connection.tenantName}.
      </div>
      {loadError && <div className="authError">{loadError}</div>}
      {report && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>{report.title || "Bank Summary"}</th>
                {report.columnLabels.map((c, i) => (
                  <th key={i}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.rows.map((r, i) => (
                <tr key={i} style={r.isSummary ? { fontWeight: 800 } : undefined}>
                  <td style={{ whiteSpace: "pre" }}>{r.label}</td>
                  {r.values.map((v, j) => (
                    <td key={j}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
