import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

interface Chip {
  label: string;
  href: string;
  kind: "Sales Measure" | "Check Measure" | "Remedial" | "WOF" | "Rego" | "Service" | "Checklist";
}

interface AllDayBar {
  label: string;
  href: string;
}

const KIND_COLOR: Record<Chip["kind"], string> = {
  "Sales Measure": "blue",
  "Check Measure": "orange",
  Remedial: "grey",
  WOF: "orange",
  Rego: "purple",
  Service: "green",
  Checklist: "grey",
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfWeek(d: Date): Date {
  // Monday-start week, matching how the team already reads the SimPRO calendar.
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() + diff);
  return monday;
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  await requireUser();
  const { week } = await searchParams;

  const anchor = week ? new Date(week) : new Date();
  const monday = startOfWeek(anchor);
  const nextMonday = new Date(monday.getTime() + 7 * DAY_MS);
  const prevWeekParam = new Date(monday.getTime() - 7 * DAY_MS).toISOString().slice(0, 10);
  const nextWeekParam = nextMonday.toISOString().slice(0, 10);

  const days = Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * DAY_MS));

  const [scheduledTasks, vehicles, checklists] = await Promise.all([
    prisma.jobScheduledTask.findMany({
      where: { status: "Scheduled", scheduledDate: { gte: monday, lt: nextMonday } },
      include: { job: { include: { client: true } }, assignees: true },
      orderBy: { scheduledDate: "asc" },
    }),
    prisma.vehicle.findMany({ select: { name: true, wofDueDate: true, regoDueDate: true, serviceDueDate: true } }),
    prisma.vehicleChecklist.findMany({
      where: { status: { not: "Completed" }, dueDate: { gte: monday, lt: nextMonday } },
      select: { dueDate: true, vehicle: { select: { name: true } } },
    }),
  ]);

  const allDayByDay: AllDayBar[][] = days.map(() => []);
  const chipsByDay: (Chip & { dayIndex: number })[][] = days.map(() => []);

  const dayIndexOf = (d: Date) => Math.floor((new Date(d).setHours(0, 0, 0, 0) - monday.getTime()) / DAY_MS);

  for (const t of scheduledTasks) {
    const idx = dayIndexOf(t.scheduledDate);
    if (idx < 0 || idx > 6) continue;
    const who = t.assignees.map((a) => a.name).join(", ") || "Unallocated";
    const label = `${t.jobNumber} — ${t.job.client?.name ?? t.job.title} — ${who}`;
    const href = `/jobs/${t.jobNumber}`;

    if (t.type === "Installation") {
      allDayByDay[idx].push({ label: `${label} (Install)`, href });
    } else {
      chipsByDay[idx].push({ label: `${label} (${t.type})`, href, kind: t.type as Chip["kind"], dayIndex: idx });
    }
  }

  for (const v of vehicles) {
    for (const [field, kind] of [
      ["wofDueDate", "WOF"],
      ["regoDueDate", "Rego"],
      ["serviceDueDate", "Service"],
    ] as const) {
      const date = v[field];
      if (!date) continue;
      const idx = dayIndexOf(date);
      if (idx < 0 || idx > 6) continue;
      chipsByDay[idx].push({ label: v.name, href: `/vehicles/${encodeURIComponent(v.name)}`, kind, dayIndex: idx });
    }
  }
  for (const c of checklists) {
    const idx = dayIndexOf(c.dueDate);
    if (idx < 0 || idx > 6) continue;
    chipsByDay[idx].push({ label: c.vehicle.name, href: `/vehicles/${encodeURIComponent(c.vehicle.name)}`, kind: "Checklist", dayIndex: idx });
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Calendar</h2>
          <div className="subtitle">
            Week view — installs run as full-width bars, Check Measure / Sales Measure / Remedial bookings show as
            coloured chips underneath.
          </div>
        </div>
        <div className="actions">
          <Link href={`/calendar?week=${prevWeekParam}`} className="btn light">
            ← Prev Week
          </Link>
          <Link href="/calendar" className="btn light">
            Today
          </Link>
          <Link href={`/calendar?week=${nextWeekParam}`} className="btn light">
            Next Week →
          </Link>
        </div>
      </div>

      <div
        className="card"
        style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, padding: 12, overflowX: "auto" }}
      >
        {days.map((d, i) => {
          const dStr = d.toISOString().slice(0, 10);
          const isToday = dStr === todayStr;
          return (
            <div
              key={i}
              style={{
                border: isToday ? "2px solid var(--blueDark, #0b3d91)" : "1px solid #e5e7eb",
                borderRadius: 8,
                minHeight: 220,
                padding: 6,
                background: isToday ? "#f0f6ff" : "#fff",
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 6 }}>
                {d.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" })}
              </div>

              {allDayByDay[i].map((bar, bi) => (
                <Link
                  key={bi}
                  href={bar.href}
                  style={{
                    display: "block",
                    background: "#dc2626",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 4,
                    padding: "3px 5px",
                    marginBottom: 3,
                    textDecoration: "none",
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
                    className={`status ${KIND_COLOR[chip.kind]}`}
                    style={{ display: "block", textDecoration: "none", fontSize: 11, padding: "3px 5px", lineHeight: 1.3 }}
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
