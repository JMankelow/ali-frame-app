// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { taskStatusHex } from "@/lib/statusColors";
import { ReviewAlerts } from "./ReviewAlerts";
import { WorkClockPanel } from "../timesheets/WorkClockPanel";

const DAYS_SHOWN = 14;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** The home page for field staff: their own work only — no finance, leads or company-wide numbers. */
export async function InstallerDashboard({ userId, name, role }: { userId: string; name: string; role?: string }) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // "Today" in NZ, as a date-only value (bookings are stored as date-only, UTC midnight)
  const nzToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland" }).format(new Date());
  const first = new Date(`${nzToday}T00:00:00Z`);
  const last = new Date(first);
  last.setUTCDate(last.getUTCDate() + DAYS_SHOWN - 1);

  const alerts = await prisma.notification.findMany({ where: { userId, readAt: null }, orderBy: { createdAt: "desc" }, take: 3 });
  const [bookings, jobs, checklists, assetCount, preStartToday] = await Promise.all([
    prisma.jobScheduledTask.findMany({
      where: {
        assignees: { some: { id: userId } },
        type: "Installation", // installs only — not measures
        status: { not: "Cancelled" },
        scheduledDate: { lte: last },
        OR: [{ endDate: { gte: first } }, { endDate: null, scheduledDate: { gte: first } }],
      },
      include: { job: { select: { number: true, title: true, address: true } } },
      orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
    }),
    prisma.job.count({ where: { archived: false, assignedUserId: userId } }),
    prisma.vehicleChecklist.findMany({ where: { assignedToId: userId, status: { not: "Completed" } }, include: { vehicle: true } }),
    prisma.asset.count({ where: { status: "Active", OR: [{ assignedToUserId: userId }, { assignedToVehicle: { assignedToUserId: userId } }] } }),
    prisma.hsPreStart.count({ where: { completedById: userId, date: { gte: startOfToday } } }),
  ]);

  // My calendar: the next two weeks, one box per day (multi-day bookings appear on every day they run)
  const days = Array.from({ length: DAYS_SHOWN }, (_, i) => {
    const d = new Date(first);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });
  const byDay = new Map<string, typeof bookings>();
  for (const b of bookings) {
    const end = b.endDate ?? b.scheduledDate;
    for (const d of days) {
      if (d >= b.scheduledDate && d <= end) byDay.set(dayKey(d), [...(byDay.get(dayKey(d)) ?? []), b]);
    }
  }

  const card = { textDecoration: "none", color: "inherit" } as const;
  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Dashboard</h2>
          <div className="subtitle">Welcome back, {name.split(" ")[0]}.</div>
        </div>
        <Link href="/policies" className="btn light">Company Policies</Link>
      </div>

      <ReviewAlerts userId={userId} />

      <WorkClockPanel user={{ id: userId, isSuperUser: false, role }} onlyIfRunning />

      {alerts.length > 0 && (
        <Link href="/tasks" className="card" style={{ ...{ textDecoration: "none", color: "inherit" }, display: "block", borderLeft: "6px solid #0057b8", marginBottom: 16 }}>
          <div className="label">New alerts ({alerts.length}{alerts.length === 3 ? "+" : ""})</div>
          {alerts.map((a) => (
            <div key={a.id} style={{ marginTop: 6, fontWeight: 600 }}>{a.text.length > 140 ? a.text.slice(0, 140) + "…" : a.text}</div>
          ))}
          <div className="hint" style={{ marginTop: 6 }}>Tap to see all →</div>
        </Link>
      )}

      <div className="cards">
        <Link href="/health-safety/prestart" className="card" style={card}>
          <div className="label">Today&apos;s toolbox</div>
          <span className={`status ${preStartToday > 0 ? "green" : "orange"}`}>{preStartToday > 0 ? "Done" : "Not done yet"}</span>
          <div className="hint" style={{ marginTop: 6 }}>Health &amp; Safety → Daily Toolbox</div>
        </Link>
        <Link href="/jobs" className="card" style={card}>
          <div className="label">My jobs</div>
          <div className="metric">{jobs}</div>
        </Link>
        <Link href="/vehicles" className="card" style={card}>
          <div className="label">Vehicle checks to do</div>
          <div className="metric">{checklists.length}</div>
          <span className={`status ${checklists.length ? "orange" : "green"}`}>{checklists.length ? checklists.map((c) => c.vehicle.name).join(", ") : "All done"}</span>
        </Link>
        <Link href="/timesheets" className="card" style={{ ...card, background: "#0057b8", color: "#fff", border: "none", boxShadow: "0 6px 16px rgba(0,87,184,.35)" }}>
          <div className="label" style={{ color: "#fff" }}>Log time</div>
          <div className="metric" style={{ color: "#fff", fontSize: 28 }}>+ Add hours</div>
          <div className="hint" style={{ color: "#dbeafe", marginTop: 6 }}>start the clock or add hours</div>
        </Link>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="actions">
          <Link href="/assets" className="btn light">My Assets ({assetCount})</Link>
          <Link href="/jobs" className="btn light">All Jobs</Link>
          <Link href="/health-safety" className="btn light">Health &amp; Safety</Link>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="topbar" style={{ marginBottom: 8 }}>
          <div className="label">My calendar — next two weeks</div>
          <Link href="/calendar" className="hint" style={{ fontWeight: 600, color: "var(--blueDark)", textDecoration: "none" }}>Open full calendar →</Link>
        </div>
        {bookings.length === 0 && <div className="hint" style={{ marginBottom: 8 }}>Nothing booked for you in the next two weeks.</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 8 }}>
          {days.map((d) => {
            const list = byDay.get(dayKey(d)) ?? [];
            const isToday = dayKey(d) === nzToday;
            const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
            if (weekend && list.length === 0) return null;
            return (
              <div key={dayKey(d)} style={{ border: `1.5px solid ${isToday ? "#0057b8" : "var(--line)"}`, borderRadius: 10, padding: 8, background: isToday ? "#eef6ff" : "#fff", minHeight: 70 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  {d.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}
                  {isToday && <span className="status blue" style={{ marginLeft: 6 }}>Today</span>}
                </div>
                {list.length === 0 && <div className="hint" style={{ marginTop: 6 }}>—</div>}
                {list.map((b) => (
                  <Link key={b.id} href={`/jobs/${b.job.number}`} style={{ display: "block", marginTop: 6, padding: "4px 6px", borderLeft: `5px solid ${taskStatusHex(b.status) ?? "#0057b8"}`, background: "#f6f8fb", borderRadius: 6, textDecoration: "none", color: "inherit" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#475467" }}>
                      {b.startTime ? `${b.startTime}${b.endTime ? `–${b.endTime}` : ""} · ` : ""}{b.type}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--blueDark)" }}>{b.job.number} — {b.job.title}</div>
                    {b.job.address && <div className="hint" style={{ fontSize: 11 }}>{b.job.address}</div>}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
