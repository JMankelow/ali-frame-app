import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const user = await requireUser();

  const [jobCount, activeJobCount, leadCount, newLeadCount] = await Promise.all([
    prisma.job.count(),
    prisma.job.count({ where: { archived: false } }),
    prisma.lead.count(),
    prisma.lead.count({ where: { status: "New" } }),
  ]);

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Dashboard</h2>
          <div className="subtitle">Welcome back, {user.name.split(" ")[0]}.</div>
        </div>
      </div>

      <div className="notice">
        This is the new, real, shared version of the Ali-Frame Job Management System — data
        here is stored in a real database and visible to every signed-in team member, unlike
        the old prototype. Site Measure, Quote Comparison, Prepare Price and the other tools
        are still on the prototype for now (link in the sidebar) while they get migrated.
      </div>

      <div className="cards">
        <div className="card">
          <div className="label">Active Jobs</div>
          <div className="metric">{activeJobCount}</div>
          <div className="hint">{jobCount} total, including archived</div>
        </div>
        <div className="card">
          <div className="label">New Leads</div>
          <div className="metric">{newLeadCount}</div>
          <div className="hint">{leadCount} total leads</div>
        </div>
      </div>
    </div>
  );
}
