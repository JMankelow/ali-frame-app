// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import Link from "next/link";
import type { CSSProperties } from "react";
import { requireUser } from "@/lib/session";
import { isInstallerProfile } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { CalendarFilters } from "./CalendarFilters";
import { ALL_TYPES, FIELD_TYPES } from "./types";
import { taskStatusHex, textOn } from "@/lib/statusColors";
import { AddLeaveForm } from "./AddLeaveForm";
import { AddBookingDialog, AddOnDay, SlotLayer } from "./AddBooking";
import { byNumberDesc } from "@/lib/jobSort";

// ---------- model ----------

interface Person {
  id: string;
  name: string;
}

interface CalEvent {
  key: string;
  label: string; // one line: "12122 — John Laurence"
  sub?: string; // second line on timed blocks (booking status)
  kind: string; // Installation / Check Measure / Sales Measure / Remedial / Leave / Vehicle Maintenance
  href: string;
  bg: string;
  fg: string;
  people: Person[];
  start: Date; // first day
  end: Date; // last day (inclusive)
  startTime?: string | null; // "HH:MM" — timed block on the grid; otherwise an all-day bar
  endTime?: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const GRID_START_HOUR = 7;
const GRID_END_HOUR = 19;
const HOUR_PX = 60;
const GUTTER = 76;

const BADGE_COLORS = ["#16a34a", "#f97316", "#374151", "#eab308", "#2563eb", "#6b7280", "#ea580c", "#1d4ed8", "#111827", "#dc2626", "#0d9488", "#b91c1c", "#7c3aed", "#db2777"];

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() + diff);
  return monday;
}

function atMidnight(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");

function badgeColor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return BADGE_COLORS[h % BADGE_COLORS.length];
}

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const fmtTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "pm" : "am";
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, "0")}` : ""}${ap}`;
};

/** Booking colours come straight from Jo's NextMinute Task Statuses palette; falls back by booking type. */
function taskColors(type: string, status: string): { bg: string; fg: string } {
  const fallback: Record<string, string> = { "Check Measure": "check measure booked", Installation: "booked in", Remedial: "remedial", "Sales Measure": "on measures / meetings" };
  const bg = taskStatusHex(status) ?? taskStatusHex(fallback[type] ?? "") ?? "#6b7280";
  return { bg, fg: textOn(bg) };
}

function Badges({ people, size = 18 }: { people: Person[]; size?: number }) {
  return (
    <>
      {people.map((p) => (
        <span
          key={p.id}
          title={p.name}
          style={{
            display: "inline-block",
            background: badgeColor(p.id),
            color: "#fff",
            fontSize: size - 8,
            fontWeight: 700,
            lineHeight: `${size}px`,
            height: size,
            minWidth: size,
            padding: "0 3px",
            borderRadius: 5,
            textAlign: "center",
            marginLeft: 3,
            verticalAlign: "middle",
          }}
        >
          {initials(p.name)}
        </span>
      ))}
    </>
  );
}

// ---------- page ----------

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; types?: string; q?: string }>;
}) {
  const me = await requireUser();
  const readOnly = isInstallerProfile(me);
  const { view: viewRaw, date: dateRaw, types: typesRaw, q: qRaw } = await searchParams;
  // Field staff open the calendar as cards (agenda) — easier on a phone; everyone can switch views.
  const view = viewRaw === "day" || viewRaw === "month" || viewRaw === "agenda" || viewRaw === "week" ? viewRaw : readOnly ? "agenda" : "week";
  const anchor = dateRaw ? atMidnight(new Date(dateRaw)) : atMidnight(new Date());
  // Installers only ever see installs (their own), leave and vehicle reminders.
  const availableTypes = readOnly ? FIELD_TYPES : ALL_TYPES;
  const activeTypes = (typesRaw ? typesRaw.split(",").filter(Boolean) : availableTypes).filter((t) => availableTypes.includes(t));
  const q = (qRaw ?? "").trim().toLowerCase();

  let gridStart: Date;
  let gridEnd: Date;
  let prevDate: Date;
  let nextDate: Date;
  let title: string;

  if (view === "day") {
    gridStart = anchor;
    gridEnd = new Date(anchor.getTime() + DAY_MS);
    prevDate = new Date(anchor.getTime() - DAY_MS);
    nextDate = gridEnd;
    title = anchor.toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } else if (view === "month") {
    const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const firstOfNextMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
    gridStart = startOfWeek(firstOfMonth);
    const lastGridDay = startOfWeek(new Date(firstOfNextMonth.getTime() - DAY_MS));
    gridEnd = new Date(lastGridDay.getTime() + 7 * DAY_MS);
    prevDate = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
    nextDate = firstOfNextMonth;
    title = firstOfMonth.toLocaleDateString("en-NZ", { month: "long", year: "numeric" });
  } else if (view === "agenda") {
    gridStart = anchor;
    gridEnd = new Date(anchor.getTime() + 30 * DAY_MS);
    prevDate = new Date(anchor.getTime() - 30 * DAY_MS);
    nextDate = gridEnd;
    title = `Next 30 days from ${anchor.toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" })}`;
  } else {
    gridStart = startOfWeek(anchor);
    gridEnd = new Date(gridStart.getTime() + 7 * DAY_MS);
    prevDate = new Date(gridStart.getTime() - 7 * DAY_MS);
    nextDate = gridEnd;
    const lastDay = new Date(gridEnd.getTime() - DAY_MS);
    title = `${gridStart.toLocaleDateString("en-NZ", { weekday: "long", month: "long", day: "numeric" })} – ${lastDay.toLocaleDateString("en-NZ", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`;
  }

  const days: Date[] = [];
  for (let t = gridStart.getTime(); t < gridEnd.getTime(); t += DAY_MS) days.push(new Date(t));

  const wantLeave = activeTypes.includes("Leave");
  const wantVehicles = activeTypes.includes("Vehicle Maintenance");
  const taskTypeFilter = ["Installation", "Check Measure", "Sales Measure", "Remedial"].filter((t) => activeTypes.includes(t));

  // for the click-to-add booking pop-up (office only)
  const bookableJobs = readOnly ? [] : byNumberDesc((await prisma.job.findMany({ where: { archived: false }, select: { number: true, title: true, client: { select: { name: true } } } })).map((j) => ({ number: j.number, title: j.client?.name ?? j.title })));

  const [scheduledTasks, leave, vehicles, checklists, staff] = await Promise.all([
    taskTypeFilter.length === 0
      ? Promise.resolve([])
      : prisma.jobScheduledTask.findMany({
          where: {
            type: { in: taskTypeFilter },
            status: { not: "Cancelled" },
            ...(readOnly ? { assignees: { some: { id: me.id } } } : {}),
            scheduledDate: { lt: gridEnd },
            OR: [{ endDate: null, scheduledDate: { gte: gridStart } }, { endDate: { gte: gridStart } }],
          },
          include: { job: { include: { client: true } }, assignees: { select: { id: true, name: true } } },
          orderBy: { scheduledDate: "asc" },
        }),
    wantLeave
      ? prisma.staffLeave.findMany({
          where: {
            fromDate: { lt: gridEnd },
            OR: [{ toDate: null, fromDate: { gte: gridStart } }, { toDate: { gte: gridStart } }],
          },
          include: { staff: { select: { id: true, name: true } } },
        })
      : Promise.resolve([]),
    wantVehicles
      ? prisma.vehicle.findMany({ select: { name: true, wofDueDate: true, regoDueDate: true, serviceDueDate: true } })
      : Promise.resolve([]),
    wantVehicles
      ? prisma.vehicleChecklist.findMany({
          where: { status: { not: "Completed" }, dueDate: { gte: gridStart, lt: gridEnd } },
          select: { dueDate: true, vehicle: { select: { name: true } } },
        })
      : Promise.resolve([]),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  // ---------- build events ----------

  const events: CalEvent[] = [];

  for (const t of scheduledTasks) {
    const c = taskColors(t.type, t.status);
    events.push({
      key: `t-${t.id}`,
      label: [t.jobNumber, t.job.client?.name ?? t.job.title].join(" — "),
      sub: t.status,
      kind: t.type,
      href: `/jobs/${t.jobNumber}`,
      bg: c.bg,
      fg: c.fg,
      people: t.assignees,
      start: atMidnight(t.scheduledDate),
      end: atMidnight(t.endDate ?? t.scheduledDate),
      startTime: t.startTime,
      endTime: t.endTime,
    });
  }

  for (const l of leave) {
    events.push({
      key: `l-${l.id}`,
      label: l.staff.length === 1 ? `${l.staff[0].name} — ${l.type}` : l.type,
      kind: "Leave",
      href: "/calendar",
      bg: taskStatusHex(l.type) ?? "#fb6b8e",
      fg: textOn(taskStatusHex(l.type) ?? "#fb6b8e"),
      people: l.staff,
      start: atMidnight(l.fromDate),
      end: atMidnight(l.toDate ?? l.fromDate),
    });
  }

  if (wantVehicles) {
    const FIELDS = { wofDueDate: "WOF due", regoDueDate: "Rego due", serviceDueDate: "Service due" } as const;
    for (const v of vehicles) {
      for (const field of ["wofDueDate", "regoDueDate", "serviceDueDate"] as const) {
        const date = v[field];
        if (!date || date < gridStart || date >= gridEnd) continue;
        events.push({
          key: `v-${v.name}-${field}`,
          label: `${v.name} — ${FIELDS[field]}`,
          kind: "Vehicle Maintenance",
          href: `/vehicles/${encodeURIComponent(v.name)}`,
          bg: "#facc15",
          fg: "#0f172a",
          people: [],
          start: atMidnight(date),
          end: atMidnight(date),
        });
      }
    }
    for (const c of checklists) {
      events.push({
        key: `c-${c.vehicle.name}-${c.dueDate.getTime()}`,
        label: `${c.vehicle.name} — vehicle check due`,
        kind: "Vehicle Maintenance",
        href: `/vehicles/${encodeURIComponent(c.vehicle.name)}`,
        bg: "#facc15",
        fg: "#0f172a",
        people: [],
        start: atMidnight(c.dueDate),
        end: atMidnight(c.dueDate),
      });
    }
  }

  const shown = q
    ? events.filter((e) => `${e.label} ${e.sub ?? ""} ${e.kind} ${e.people.map((p) => p.name).join(" ")}`.toLowerCase().includes(q))
    : events;

  const dayIndexOf = (d: Date) => Math.round((d.getTime() - gridStart.getTime()) / DAY_MS);
  const clampedRange = (e: CalEvent) => ({ s: Math.max(dayIndexOf(e.start), 0), e: Math.min(dayIndexOf(e.end), days.length - 1) });
  const inGrid = (e: CalEvent) => {
    const r = clampedRange(e);
    return r.s <= r.e;
  };

  // ---------- links ----------

  const todayStr = new Date().toISOString().slice(0, 10);
  const dParam = anchor.toISOString().slice(0, 10);
  const typesParam = activeTypes.length === availableTypes.length ? "" : `&types=${activeTypes.length === 0 ? "none" : encodeURIComponent(activeTypes.join(","))}`;
  const qParam = q ? `&q=${encodeURIComponent(q)}` : "";
  const viewLink = (v: string) => `/calendar?view=${v}&date=${dParam}${typesParam}${qParam}`;
  const navLink = (d: Date) => `/calendar?view=${view}&date=${d.toISOString().slice(0, 10)}${typesParam}${qParam}`;
  const todayLink = `/calendar?view=${view}${typesParam}${qParam}`;

  // ---------- week / day grid ----------

  const allDay = shown.filter((e) => !(e.startTime && e.start.getTime() === e.end.getTime()) && inGrid(e));
  const timed = shown.filter((e) => e.startTime && e.start.getTime() === e.end.getTime() && inGrid(e));

  // Greedy lane packing for the all-day bars.
  const lanes: number[] = []; // last occupied day index per lane
  const placed = [...allDay]
    .sort((a, b) => clampedRange(a).s - clampedRange(b).s || clampedRange(b).e - clampedRange(a).e)
    .map((e) => {
      const r = clampedRange(e);
      let lane = lanes.findIndex((end) => end < r.s);
      if (lane === -1) {
        lane = lanes.length;
        lanes.push(r.e);
      } else lanes[lane] = r.e;
      return { ev: e, lane, ...r };
    });
  const laneCount = Math.max(lanes.length, 1);

  // Side-by-side columns for overlapping timed blocks within a day.
  const timedByDay: { e: CalEvent; col: number; cols: number; top: number; height: number }[][] = days.map(() => []);
  for (let i = 0; i < days.length; i++) {
    const list = timed
      .filter((e) => dayIndexOf(e.start) === i)
      .map((e) => {
        const s = toMin(e.startTime!);
        const en = e.endTime ? Math.max(toMin(e.endTime), s + 30) : s + 60;
        return { e, s, en };
      })
      .sort((a, b) => a.s - b.s);
    let cluster: typeof list = [];
    let clusterEnd = -1;
    const colEnds: number[] = [];
    const out: { e: CalEvent; col: number; s: number; en: number; cluster: number }[] = [];
    let clusterId = 0;
    for (const item of list) {
      if (item.s >= clusterEnd && cluster.length) {
        cluster = [];
        colEnds.length = 0;
        clusterId++;
      }
      let col = colEnds.findIndex((end) => end <= item.s);
      if (col === -1) {
        col = colEnds.length;
        colEnds.push(item.en);
      } else colEnds[col] = item.en;
      cluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.en);
      out.push({ ...item, col, cluster: clusterId });
    }
    const colsByCluster = new Map<number, number>();
    for (const o of out) colsByCluster.set(o.cluster, Math.max(colsByCluster.get(o.cluster) ?? 0, o.col + 1));
    timedByDay[i] = out.map((o) => ({
      e: o.e,
      col: o.col,
      cols: colsByCluster.get(o.cluster) ?? 1,
      top: ((o.s - GRID_START_HOUR * 60) / 60) * HOUR_PX,
      height: Math.max(((o.en - o.s) / 60) * HOUR_PX, 40),
    }));
  }

  const hours: number[] = [];
  for (let h = GRID_START_HOUR; h < GRID_END_HOUR; h++) hours.push(h);
  const hourLabel = (h: number) => `${((h + 11) % 12) + 1}:00 ${h >= 12 ? "PM" : "AM"}`;
  const colTemplate = `${GUTTER}px repeat(${days.length}, minmax(0, 1fr))`;
  const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
  const dayStr = (d: Date) => d.toISOString().slice(0, 10);

  const pill = (e: CalEvent, extra?: CSSProperties) => (
    <Link
      key={e.key}
      href={e.href}
      title={`${e.label}${e.sub ? ` — ${e.sub}` : ""}${e.people.length ? ` (${e.people.map((p) => p.name).join(", ")})` : ""}`}
      style={{
        display: "block",
        background: e.bg,
        color: e.fg,
        fontSize: 12,
        fontWeight: 600,
        borderRadius: 5,
        padding: "2px 6px",
        textDecoration: "none",
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        ...extra,
      }}
    >
      {e.label}
      <Badges people={e.people} />
    </Link>
  );

  const legend: [string, string][] = [
    ["Floating", "#22dd44"],
    ["Booked in", "#2f86e8"],
    ["Booking Confirmed", "#fa3a12"],
    ["Check Measure Booked", "#2bf544"],
    ["Sales Rep - Dwayne", "#09f0e0"],
    ["Sales Rep - Tristam", "#8adcf0"],
    ["Sales Rep - Kere", "#0a9af0"],
    ["Remedial", "#f020e0"],
    ["Leave", "#fb6b8e"],
    ["Vehicle", "#facc15"],
  ];

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Calendar</h2>
          <div className="subtitle">{title}</div>
        </div>
        <form method="get" className="actions">
          <input type="hidden" name="view" value={view} />
          <input type="hidden" name="date" value={dParam} />
          {typesParam && <input type="hidden" name="types" value={activeTypes.length === 0 ? "none" : activeTypes.join(",")} />}
          <input type="search" name="q" defaultValue={qRaw ?? ""} placeholder="Search job, client, person…" style={{ minWidth: 220 }} />
          <button type="submit" className="btn light">Search</button>
          {q && <Link href={`/calendar?view=${view}&date=${dParam}${typesParam}`} className="btn light">Clear</Link>}
        </form>
      </div>

      <div
        className="card"
        style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
      >
        <div className="actions">
          <Link href={todayLink} className="btn light">Today</Link>
          <Link href={navLink(prevDate)} className="btn light" aria-label="Previous">◀</Link>
          <Link href={navLink(nextDate)} className="btn light" aria-label="Next">▶</Link>
        </div>
        <CalendarFilters activeTypes={activeTypes} types={availableTypes} />
        <div style={{ display: "flex", gap: 6 }}>
          {(["day", "week", "month", "agenda"] as const).map((v) => (
            <Link
              key={v}
              href={viewLink(v)}
              className="btn"
              style={{ background: view === v ? "#16a34a" : "#f3f4f6", color: view === v ? "#fff" : "#111827", textTransform: "capitalize", fontWeight: 700 }}
            >
              {v}
            </Link>
          ))}
        </div>
      </div>

      {!readOnly && (
        <div style={{ marginBottom: 12 }}>
          <AddLeaveForm staff={staff} />
        </div>
      )}
      {!readOnly && <AddBookingDialog jobs={bookableJobs} staff={staff} />}

      <div className="hint" style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
        {legend.map(([name, color]) => (
          <span key={name}><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: color, marginRight: 5 }} />{name}</span>
        ))}
      </div>

      {(view === "week" || view === "day") && (
        <div className="card" style={{ padding: 0, overflowX: "auto", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div style={{ minWidth: view === "day" ? 420 : 900 }}>
            {/* day headers */}
            <div style={{ display: "grid", gridTemplateColumns: colTemplate, borderBottom: "1px solid #d1d5db" }}>
              <div />
              {days.map((d) => (
                <div
                  key={d.getTime()}
                  style={{
                    textAlign: "center",
                    fontWeight: 700,
                    fontSize: 13,
                    padding: "8px 0",
                    borderLeft: "1px solid #d1d5db",
                    background: dayStr(d) === todayStr ? "#fbf7cf" : undefined,
                  }}
                >
                  {d.toLocaleDateString("en-NZ", { weekday: "short" })} {String(d.getDate()).padStart(2, "0")}/{String(d.getMonth() + 1).padStart(2, "0")}
                </div>
              ))}
            </div>

            {/* all-day bars */}
            <div style={{ display: "grid", gridTemplateColumns: colTemplate, gridTemplateRows: `repeat(${laneCount}, auto)`, borderBottom: "2px solid #d1d5db", rowGap: 3, padding: "3px 0", position: "relative" }}>
              <div style={{ gridColumn: 1, gridRow: `1 / span ${laneCount}`, fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>all day</div>
              {days.map((d, i) => (
                <div
                  key={`bg-${d.getTime()}`}
                  style={{ gridColumn: i + 2, gridRow: `1 / span ${laneCount}`, borderLeft: "1px solid #d1d5db", background: dayStr(d) === todayStr ? "#fbf7cf" : isWeekend(d) ? "#e3eef8" : undefined, margin: "-3px 0" }}
                />
              ))}
              {placed.map((p) => {
                return (
                  <div key={p.ev.key} style={{ gridColumn: `${p.s + 2} / ${p.e + 3}`, gridRow: p.lane + 1, padding: "0 2px", minWidth: 0, zIndex: 1 }}>
                    {pill(p.ev, { padding: "3px 6px" })}
                  </div>
                );
              })}
            </div>

            {/* hourly grid */}
            <div style={{ display: "grid", gridTemplateColumns: colTemplate }}>
              <div>
                {hours.map((h) => (
                  <div key={h} style={{ height: HOUR_PX, fontSize: 11, fontWeight: 600, textAlign: "right", paddingRight: 8, paddingTop: 2, boxSizing: "border-box", whiteSpace: "nowrap", color: "#475467" }}>{hourLabel(h)}</div>
                ))}
              </div>
              {days.map((d, i) => (
                <div
                  key={d.getTime()}
                  style={{
                    position: "relative",
                    height: hours.length * HOUR_PX,
                    borderLeft: "1px solid #d1d5db",
                    background: dayStr(d) === todayStr ? "#fbf7cf" : isWeekend(d) ? "#e3eef8" : undefined,
                    backgroundImage: `repeating-linear-gradient(to bottom, #d1d5db 0, #d1d5db 1px, transparent 1px, transparent ${HOUR_PX / 2}px)`,
                  }}
                >
                  {!readOnly && <SlotLayer date={dayStr(d)} startHour={GRID_START_HOUR} hourPx={HOUR_PX} />}
                  {timedByDay[i].map(({ e, col, cols, top, height }) => (
                    <Link
                      key={e.key}
                      href={e.href}
                      title={`${e.label} — ${e.sub ?? ""} ${e.startTime ? fmtTime(e.startTime) : ""}${e.endTime ? `–${fmtTime(e.endTime)}` : ""}`}
                      style={{
                        position: "absolute",
                        top: Math.max(top, 0),
                        height,
                        left: `calc(${(col / cols) * 100}% + 2px)`,
                        width: `calc(${100 / cols}% - 4px)`,
                        background: e.bg,
                        color: e.fg,
                        borderRadius: 5,
                        border: "1px solid rgba(0,0,0,0.15)",
                        padding: "3px 5px",
                        fontSize: 12,
                        lineHeight: 1.25,
                        textDecoration: "none",
                        overflow: "hidden",
                        boxSizing: "border-box",
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>
                        {fmtTime(e.startTime!)}{e.endTime ? `–${fmtTime(e.endTime)}` : ""} · {e.label}
                        <Badges people={e.people} size={17} />
                      </div>
                      {e.sub && <div style={{ fontSize: 11 }}>{e.sub}</div>}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === "month" && (
        <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4, padding: 10, overflowX: "auto", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((n) => (
            <div key={n} style={{ fontWeight: 700, fontSize: 12, textAlign: "center" }}>{n}</div>
          ))}
          {days.map((d, i) => {
            const list = shown.filter((e) => clampedRange(e).s <= i && clampedRange(e).e >= i);
            const outside = d.getMonth() !== anchor.getMonth();
            return (
              <div
                key={d.getTime()}
                style={{
                  border: dayStr(d) === todayStr ? "2px solid #16a34a" : "1px solid #e5e7eb",
                  borderRadius: 8,
                  minHeight: 110,
                  padding: 4,
                  background: dayStr(d) === todayStr ? "#fbf7cf" : isWeekend(d) ? "#eef4fa" : "#fff",
                  opacity: outside ? 0.5 : 1,
                  minWidth: 0,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 3 }}>{d.getDate()}{!readOnly && <AddOnDay date={dayStr(d)} />}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {list.slice(0, 5).map((e) => pill(e, { fontSize: 11, padding: "1px 5px" }))}
                  {list.length > 5 && (
                    <Link href={`/calendar?view=day&date=${dayStr(d)}${typesParam}${qParam}`} className="hint" style={{ textDecoration: "none" }}>+{list.length - 5} more</Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "agenda" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {days.map((d, i) => {
            const list = shown
              .filter((e) => clampedRange(e).s <= i && clampedRange(e).e >= i)
              .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
            if (list.length === 0) return null;
            const isToday = dayStr(d) === todayStr;
            return (
              <div key={d.getTime()} className="card" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)", borderLeft: `6px solid ${isToday ? "#0057b8" : "#b9dff5"}` }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: isToday ? "#0057b8" : undefined }}>
                  {d.toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" })}
                  {isToday && <span className="status blue" style={{ marginLeft: 8 }}>Today</span>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {list.map((e) => (
                    <div key={e.key} style={{ padding: "8px 10px", borderRadius: 10, background: "#f6f8fb", border: "1px solid var(--line)" }}>
                      <div className="hint" style={{ fontSize: 12, fontWeight: 700 }}>
                        {e.startTime ? `${fmtTime(e.startTime)}${e.endTime ? `–${fmtTime(e.endTime)}` : ""}` : "All day"} · {e.sub ?? e.kind}
                      </div>
                      <div style={{ marginTop: 4 }}>{pill(e)}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {shown.filter(inGrid).length === 0 && <div className="card hint">Nothing booked in this period.</div>}
        </div>
      )}
    </div>
  );
}
