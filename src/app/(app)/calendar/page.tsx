import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CalendarFilters, ALL_TYPES } from "./CalendarFilters";
import { AddLeaveForm } from "./AddLeaveForm";

interface Chip {
  label: string;
  href: string;
  kind: "Check Measure" | "Sales Measure" | "Remedial" | "Vehicle Maintenance";
}

interface AllDayBar {
  label: string;
  href: string;
  color: string;
}

const CHIP_COLOR: Record<Chip["kind"], string> = {
  "Check Measure": "orange",
  "Sales Measure": "blue",
  Remedial: "orange",
  "Vehicle Maintenance": "grey",
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=Sun..6=Sat
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

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; types?: string }>;
}) {
  await requireUser();
  const { view: viewRaw, date: dateRaw, types: typesRaw } = await searchParams;
  const view = viewRaw === "day" || viewRaw === "month" ? viewRaw : "week";
  const anchor = dateRaw ? atMidnight(new Date(dateRaw)) : atMidnight(new Date());
  const activeTypes = typesRaw ? typesRaw.split(",").filter(Boolean) : ALL_TYPES;

  let gridStart: Date;
  let gridEnd: Date;
  let prevDate: Date;
  let nextDate: Date;
  let title: string;

  if (view === "day") {
    gridStart = anchor;
    gridEnd = new Date(anchor.getTime() + DAY_MS);
    prevDate = new Date(anchor.getTime() - DAY_MS);
    nextDate = new Date(anchor.getTime() + DAY_MS);
    title = anchor.toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } else if (view === "month") {
    const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const firstOfNextMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
    gridStart = startOfWeek(firstOfMonth);
    const lastGridDay = startOfWeek(new Date(firstOfNextMonth.getTime() - DAY_MS));
    gridEnd = new Date(lastGridDay.getTime() + 7 * DAY_MS);
    prevDate = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
    nextDate = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
    title = firstOfMonth.toLocaleDateString("en-NZ", { month: "long", year: "numeric" });
  } else {
    gridStart = startOfWeek(anchor);
    gridEnd = new Date(gridStart.getTime() + 7 * DAY_MS);
    prevDate = new Date(gridStart.getTime() - 7 * DAY_MS);
    nextDate = gridEnd;
    const lastDay = new Date(gridEnd.getTime() - DAY_MS);
    title = `${gridStart.toLocaleDateString("en-NZ", { day: "numeric", month: "short" })} – ${lastDay.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}`;
  }

  const days = [];
  for (let t = gridStart.getTime(); t < gridEnd.getTime(); t += DAY_MS) days.push(new Date(t));

  const wantInstallation = activeTypes.includes("Installation");
  const wantCheckMeasure = activeTypes.includes("Check Measure");
  const wantSalesMeasure = activeTypes.includes("Sales Measure");
  const wantRemedial = activeTypes.includes("Remedial");
  const wantLeave = activeTypes.includes("Leave");
  const wantVehicles = activeTypes.includes("Vehicle Maintenance");

  const taskTypeFilter = ["Installation", "Check Measure", "Sales Measure", "Remedial"].filter((t) =>
    activeTypes.includes(t)
  );

  const [scheduledTasks, leave, vehicles, checklists, staff] = await Promise.all([
    taskTypeFilter.length === 0
      ? Promise.resolve([])
      : prisma.jobScheduledTask.findMany({
          where: {
            type: { in: taskTypeFilter },
            scheduledDate: { lt: gridEnd },
            OR: [{ endDate: null, scheduledDate: { gte: gridStart } }, { endDate: { gte: gridStart } }],
          },
          include: { job: { include: { client: true } }, assignees: true },
          orderBy: { scheduledDate: "asc" },
        }),
    wantLeave
      ? prisma.staffLeave.findMany({
          where: {
            fromDate: { lt: gridEnd },
            OR: [{ toDate: null, fromDate: { gte: gridStart } }, { toDate: { gte: gridStart } }],
          },
          include: { staff: true },
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

  const allDayByDay: AllDayBar[][] = days.map(() => []);
  const chipsByDay: Chip[][] = days.map(() => []);

  const dayIndexOf = (d: Date) => Math.floor((atMidnight(new Date(d)).getTime() - gridStart.getTime()) / DAY_MS);

  function spanEachDay(from: Date, to: Date, fn: (idx: number) => void) {
    const start = Math.max(dayIndexOf(from), 0);
    const end = Math.min(dayIndexOf(to), days.length - 1);
    for (let i = start; i <= end; i++) fn(i);
  }

  for (const t of scheduledTasks) {
    const who = t.assignees.map((a) => a.name).join(", ") || "Unallocated";
    const label = `${t.jobNumber} — ${t.job.client?.name ?? t.job.title} — ${who}`;
    const href = `/jobs/${t.jobNumber}`;
    const to = t.endDate ?? t.scheduledDate;

    if (t.type === "Installation" && wantInstallation) {
      spanEachDay(t.scheduledDate, to, (idx) => allDayByDay[idx].push({ label: `${label} (Install)`, href, color: "#dc2626" }));
    } else if (t.type === "Check Measure" && wantCheckMeasure) {
      spanEachDay(t.scheduledDate, to, (idx) => chipsByDay[idx].push({ label: `${label} (Check Measure)`, href, kind: "Check Measure" }));
    } else if (t.type === "Sales Measure" && wantSalesMeasure) {
      spanEachDay(t.scheduledDate, to, (idx) => chipsByDay[idx].push({ label: `${label} (Sales Measure)`, href, kind: "Sales Measure" }));
    } else if (t.type === "Remedial" && wantRemedial) {
      spanEachDay(t.scheduledDate, to, (idx) => chipsByDay[idx].push({ label: `${label} (Remedial)`, href, kind: "Remedial" }));
    }
  }

  for (const l of leave) {
    const who = l.staff.map((s) => s.name).join(", ") || "Unallocated";
    spanEachDay(l.fromDate, l.toDate ?? l.fromDate, (idx) =>
      allDayByDay[idx].push({ label: `${who} — ${l.type}`, href: "/calendar", color: "#f472b6" })
    );
  }

  if (wantVehicles) {
    for (const v of vehicles) {
      for (const field of ["wofDueDate", "regoDueDate", "serviceDueDate"] as const) {
        const date = v[field];
        if (!date) continue;
        const idx = dayIndexOf(date);
        if (idx < 0 || idx > days.length - 1) continue;
        chipsByDay[idx].push({ label: v.name, href: `/vehicles/${encodeURIComponent(v.name)}`, kind: "Vehicle Maintenance" });
      }
    }
    for (const c of checklists) {
      const idx = dayIndexOf(c.dueDate);
      if (idx < 0 || idx > days.length - 1) continue;
      chipsByDay[idx].push({ label: c.vehicle.name, href: `/vehicles/${encodeURIComponent(c.vehicle.name)}`, kind: "Vehicle Maintenance" });
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const dParam = anchor.toISOString().slice(0, 10);
  const typesParam = activeTypes.length === ALL_TYPES.length ? "" : `&types=${encodeURIComponent(activeTypes.join(","))}`;
  const viewLink = (v: string) => `/calendar?view=${v}&date=${dParam}${typesParam}`;
  const navLink = (d: Date) => `/calendar?view=${view}&date=${d.toISOString().slice(0, 10)}${typesParam}`;

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Calendar</h2>
          <div className="subtitle">
            {title} — installs and leave run as full-width bars, Check Measure / Sales Measure / Remedial / vehicle
            bookings show as coloured chips underneath.
          </div>
        </div>
        <div className="actions">
          <Link href={navLink(prevDate)} className="btn light">
            ← Prev
          </Link>
          <Link href={`/calendar?view=${view}`} className="btn light">
            Today
          </Link>
          <Link href={navLink(nextDate)} className="btn light">
            Next →
          </Link>
        </div>
      </div>

      <div
        className="card"
        style={{
          marginBottom: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <CalendarFilters activeTypes={activeTypes} />
        <div style={{ display: "flex", gap: 6 }}>
          {(["day", "week", "month"] as const).map((v) => (
            <Link
              key={v}
              href={viewLink(v)}
              className="btn"
              style={{
                background: view === v ? "#111827" : "#f3f4f6",
                color: view === v ? "#fff" : "#111827",
                textTransform: "capitalize",
                fontWeight: 700,
              }}
            >
              {v}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <AddLeaveForm staff={staff} />
      </div>

      <div
        className="card"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${view === "day" ? 1 : 7}, 1fr)`,
          gap: 8,
          padding: 12,
          overflowX: "auto",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        {days.map((d, i) => {
          const dStr = d.toISOString().slice(0, 10);
          const isToday = dStr === todayStr;
          const isOutsideMonth = view === "month" && d.getMonth() !== anchor.getMonth();
          return (
            <div
              key={i}
              style={{
                border: isToday ? "2px solid #0b3d91" : "1px solid #e5e7eb",
                borderRadius: 10,
                minHeight: view === "month" ? 110 : 220,
                padding: 7,
                background: isToday ? "#f0f6ff" : isOutsideMonth ? "#fafafa" : "#fff",
                opacity: isOutsideMonth ? 0.55 : 1,
                transition: "background 0.15s",
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 6, color: isToday ? "#0b3d91" : "#111827" }}>
                {d.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" })}
              </div>

              {allDayByDay[i].map((bar, bi) => (
                <Link
                  key={bi}
                  href={bar.href}
                  style={{
                    display: "block",
                    background: bar.color,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 5,
                    padding: "3px 6px",
                    marginBottom: 3,
                    textDecoration: "none",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {bar.label}
                </Link>
              ))}

              <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: allDayByDay[i].length ? 6 : 0 }}>
                {chipsByDay[i].map((chip, ci) => (
                  <Link
                    key={ci}
                    href={chip.href}
                    className={`status ${CHIP_COLOR[chip.kind]}`}
                    style={{
                      display: "block",
                      textDecoration: "none",
                      fontSize: 11,
                      padding: "3px 6px",
                      lineHeight: 1.3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: view === "month" ? "nowrap" : "normal",
                    }}
                  >
                    {chip.label}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
