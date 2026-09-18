import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TimesheetForm } from "./TimesheetForm";
import { approveTimesheetEntry } from "./actions";

const TIMESHEET_ADMIN_ROLES = ["ADMIN_MANAGEMENT", "OFFICE_SCHEDULING"];

export default async function TimesheetsPage() {
  const user = await requireUser();
  const isTimesheetAdmin = user.isSuperUser || TIMESHEET_ADMIN_ROLES.includes(user.role);

  const [entries, jobs, allStaff] = await Promise.all([
    prisma.timesheetEntry.findMany({
      include: { user: true },
      orderBy: { dateWorked: "desc" },
      take: 100,
    }),
    prisma.job.findMany({ where: { archived: false }, orderBy: { number: "asc" }, select: { number: true, title: true } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  // Installers/crew can only log their own hours (enforced again server-side
  // in the action) — office/management can log on behalf of anyone.
  const staff = isTimesheetAdmin ? allStaff : allStaff.filter((s) => s.id === user.id);

  const totalHours = entries.reduce((sum, e) => sum + e.totalHours, 0);
  const pendingCount = entries.filter((e) => e.status !== "Approved").length;

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Timesheets</h2>
          <div className="subtitle">Installers and crew select a job before logging time — hours feed job costing and WIP reporting once those exist.</div>
        </div>
      </div>

      <div className="cards">
        <div className="card">
          <div className="label">Total Hours Logged</div>
          <div className="metric">{totalHours.toFixed(1)}</div>
          <span className="status blue">Last 100 entries</span>
        </div>
        <div className="card">
          <div className="label">Pending Approval</div>
          <div className="metric">{pendingCount}</div>
          <span className="status orange">Office review</span>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Staff</th>
              <th>Job</th>
              <th>Work Type</th>
              <th>Hours</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{e.dateWorked.toLocaleDateString("en-NZ")}</td>
                <td>{e.user.name}</td>
                <td>{e.jobNumber}</td>
                <td>{e.workType}</td>
                <td>{e.totalHours.toFixed(2)}</td>
                <td>
                  <span className={`status ${e.status === "Approved" ? "green" : "orange"}`}>{e.status}</span>
                </td>
                <td>
                  {e.status !== "Approved" && isTimesheetAdmin && (
                    <form action={approveTimesheetEntry.bind(null, e.id)}>
                      <button type="submit" className="btn light">
                        Approve
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={7} className="hint">
                  No timesheet entries yet — add the first one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <TimesheetForm jobs={jobs} staff={staff} currentUserId={user.id} />
    </div>
  );
}
