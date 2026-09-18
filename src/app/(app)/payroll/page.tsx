import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default async function PayrollPage() {
  await requireRole("ADMIN_MANAGEMENT", "OFFICE_SCHEDULING");

  const since = new Date();
  since.setDate(since.getDate() - 28);

  const entries = await prisma.timesheetEntry.findMany({
    where: { dateWorked: { gte: since } },
    include: { user: true },
    orderBy: { dateWorked: "desc" },
  });

  const thisWeekStart = startOfWeek(new Date());
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  interface Row {
    name: string;
    thisWeek: number;
    lastWeek: number;
    last28Days: number;
  }
  const byUser = new Map<string, Row>();

  for (const e of entries) {
    const row = byUser.get(e.userId) ?? { name: e.user.name, thisWeek: 0, lastWeek: 0, last28Days: 0 };
    row.last28Days += e.totalHours;
    if (e.dateWorked >= thisWeekStart) row.thisWeek += e.totalHours;
    else if (e.dateWorked >= lastWeekStart) row.lastWeek += e.totalHours;
    byUser.set(e.userId, row);
  }

  const rows = Array.from(byUser.values()).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Payroll</h2>
          <div className="subtitle">
            Hours summary from real submitted timesheets — no wage rates are stored in this app yet, so this shows
            hours only. Full payroll processing will integrate with PayHero once that&apos;s connected.
          </div>
        </div>
      </div>

      <div className="notice">
        Restricted to Admin/Management and Office/Scheduling — installers and crew see only their own hours under
        Timesheets.
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Staff Member</th>
              <th>This Week</th>
              <th>Last Week</th>
              <th>Last 28 Days</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td>{r.thisWeek.toFixed(1)}</td>
                <td>{r.lastWeek.toFixed(1)}</td>
                <td>{r.last28Days.toFixed(1)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="hint">
                  No timesheet entries in the last 28 days yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
