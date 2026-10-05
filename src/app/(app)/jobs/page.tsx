import { requireUser } from "@/lib/session";
import { isInstallerProfile } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { JobForm } from "./JobForm";
import { JobsView } from "./JobsView";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; archived?: string }>;
}) {
  const user = await requireUser();
  const readOnly = isInstallerProfile(user);
  const { type, archived } = await searchParams;
  const showArchived = archived === "1";
  const jobType = type === "Residential" || type === "Commercial" ? type.toUpperCase() : null;

  const jobsRaw = await prisma.job.findMany({
    where: {
      archived: showArchived,
      ...(jobType ? { type: jobType as "RESIDENTIAL" | "COMMERCIAL" } : {}),
    },
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });

  // Next free job number = highest plain-number job + 1; supplier drop-down from the real supplier list.
  const [numbers, supplierRows] = await Promise.all([
    prisma.job.findMany({ select: { number: true } }),
    prisma.supplier.findMany({ select: { companyName: true }, where: { NOT: { companyName: { startsWith: "Ali-Frame (internal" } } } }),
  ]);
  const highest = numbers.reduce((max, j) => (/^\d+$/.test(j.number) ? Math.max(max, Number(j.number)) : max), 0);
  const nextNumber = highest ? String(highest + 1) : "";
  const supplierNames = [...new Set(supplierRows.map((r) => r.companyName.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const jobs = jobsRaw.map((j) => ({ ...j, clientName: j.client?.name ?? null }));

  const heading = showArchived ? "Inactive Jobs" : type ? `${type} Jobs` : "Jobs";

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>{heading}</h2>
          <div className="subtitle">
            {jobs.length} {showArchived ? "inactive" : "active"} job(s) — shared, real-time for everyone signed in.
          </div>
        </div>
        {!readOnly && (
          <a href="#add-job" className="btn primary">
            + New Job
          </a>
        )}
      </div>

      <JobsView jobs={jobs} showArchived={showArchived} canManage={!readOnly} />

      {!readOnly && <JobForm nextNumber={nextNumber} suppliers={supplierNames} />}
    </div>
  );
}
