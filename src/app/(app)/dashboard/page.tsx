import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getXeroConnectionStatus } from "@/lib/xero";

function money(v: number): string {
  return v.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
}

export default async function DashboardPage() {
  const user = await requireUser();

  const [
    jobCount,
    activeJobCount,
    leadCount,
    newLeadCount,
    openRemedialCount,
    openVehicleIssueCount,
    myOpenTaskCount,
    wipJobs,
    xeroConnection,
  ] = await Promise.all([
    prisma.job.count(),
    prisma.job.count({ where: { archived: false } }),
    prisma.lead.count(),
    prisma.lead.count({ where: { status: "New" } }),
    prisma.remedialItem.count({ where: { status: "Open" } }),
    prisma.vehicleIssue.count({ where: { status: "Open" } }),
    prisma.note.count({ where: { assignedToId: user.id, status: { not: "Done" } } }),
    prisma.job.findMany({
      where: { archived: false, status: { not: "Completed" } },
      include: { costing: { select: { quotedTotal: true } } },
    }),
    getXeroConnectionStatus(),
  ]);

  const wipTotal = wipJobs.reduce((sum, j) => sum + (j.costing?.quotedTotal ?? 0), 0);

  const today = new Date();
  const in14Days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const vehiclesDueSoon = await prisma.vehicle.count({
    where: {
      OR: [
        { wofDueDate: { lte: in14Days } },
        { regoDueDate: { lte: in14Days } },
        { serviceDueDate: { lte: in14Days } },
      ],
    },
  });

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Dashboard</h2>
          <div className="subtitle">Welcome back, {user.name.split(" ")[0]}.</div>
        </div>
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
        <Link href="/wip" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="label">Quoted Value In Progress</div>
          <div className="metric">{money(wipTotal)}</div>
          <div className="hint">{wipJobs.length} job(s) in progress</div>
        </Link>
        <Link href="/remedial" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="label">Open Remedials</div>
          <div className="metric">{openRemedialCount}</div>
          <span className={`status ${openRemedialCount > 0 ? "orange" : "green"}`}>{openRemedialCount > 0 ? "Needs attention" : "All clear"}</span>
        </Link>
        <Link href="/vehicles" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="label">Open Vehicle Issues</div>
          <div className="metric">{openVehicleIssueCount}</div>
          <div className="hint">{vehiclesDueSoon} vehicle(s) with WOF/Rego/Service due within 14 days</div>
        </Link>
        <Link href="/tasks" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="label">My Open Tasks</div>
          <div className="metric">{myOpenTaskCount}</div>
        </Link>
      </div>

      <div className="card">
        <div className="topbar" style={{ marginBottom: 0 }}>
          <div className="label">Xero</div>
          {xeroConnection ? (
            <span className="status green">Connected — {xeroConnection.tenantName}</span>
          ) : (
            <Link href="/sync/xero" className="btn primary">
              Connect Xero
            </Link>
          )}
        </div>
      </div>

      <div className="notice" style={{ marginTop: 16 }}>
        This is the new, real, shared version of the Ali-Frame Job Management System — data
        here is stored in a real database and visible to every signed-in team member, unlike
        the old prototype. Site Measure, Quote Comparison, Prepare Price and the other tools
        are still on the prototype for now (link in the sidebar) while they get migrated.
      </div>
    </div>
  );
}
