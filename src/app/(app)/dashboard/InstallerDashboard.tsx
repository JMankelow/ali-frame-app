// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ReviewAlerts } from "./ReviewAlerts";

/** The home page for field staff: their own work only — no finance, leads or company-wide numbers. */
export async function InstallerDashboard({ userId, name }: { userId: string; name: string }) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [bookings, jobs, checklists, assetCount, preStartToday] = await Promise.all([
    prisma.jobScheduledTask.findMany({
      where: { assignees: { some: { id: userId } }, scheduledDate: { gte: startOfToday }, status: { not: "Cancelled" } },
      include: { job: { select: { number: true, title: true, address: true } } },
      orderBy: { scheduledDate: "asc" },
      take: 8,
    }),
    prisma.job.count({ where: { archived: false, assignedUserId: userId } }),
    prisma.vehicleChecklist.findMany({ where: { assignedToId: userId, status: { not: "Completed" } }, include: { vehicle: true } }),
    prisma.asset.count({ where: { status: "Active", OR: [{ assignedToUserId: userId }, { assignedToVehicle: { assignedToUserId: userId } }] } }),
    prisma.hsPreStart.count({ where: { completedById: userId, date: { gte: startOfToday } } }),
  ]);

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

      <div className="cards">
        <Link href="/health-safety/prestart" className="card" style={card}>
          <div className="label">Today&apos;s toolbox</div>
          <span className={`status ${preStartToday > 0 ? "green" : "orange"}`}>{preStartToday > 0 ? "Done" : "Not done yet"}</span>
          <div className="hint" style={{ marginTop: 6 }}>Health &amp; Safety → Daily Toolbox</div>
        </Link>
        <Link href="/crew" className="card" style={card}>
          <div className="label">My jobs</div>
          <div className="metric">{jobs}</div>
        </Link>
        <Link href="/vehicles" className="card" style={card}>
          <div className="label">Vehicle checks to do</div>
          <div className="metric">{checklists.length}</div>
          <span className={`status ${checklists.length ? "orange" : "green"}`}>{checklists.length ? checklists.map((c) => c.vehicle.name).join(", ") : "All done"}</span>
        </Link>
        <Link href="/assets" className="card" style={card}>
          <div className="label">My assets</div>
          <div className="metric">{assetCount}</div>
        </Link>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="label">My upcoming bookings</div>
        <table style={{ marginTop: 8 }}>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td>{b.scheduledDate.toLocaleDateString("en-NZ")}</td>
                <td><span className="status blue">{b.type}</span></td>
                <td><Link href={`/jobs/${b.job.number}`} style={{ fontWeight: 800, color: "var(--blueDark)", textDecoration: "none" }}>{b.job.number} — {b.job.title}</Link></td>
                <td className="hint">{b.job.address ?? ""}</td>
              </tr>
            ))}
            {bookings.length === 0 && <tr><td className="hint">Nothing booked for you yet — check the Calendar.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="actions">
          <Link href="/timesheets" className="btn primary">Log Time</Link>
          <Link href="/calendar" className="btn light">Calendar</Link>
          <Link href="/jobs" className="btn light">All Jobs</Link>
          <Link href="/health-safety" className="btn light">Health &amp; Safety</Link>
        </div>
      </div>
    </div>
  );
}
