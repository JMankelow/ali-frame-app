import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { JobForm } from "./JobForm";
import { JobsView } from "./JobsView";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; archived?: string }>;
}) {
  await requireUser();
  const { type, archived } = await searchParams;
  const showArchived = archived === "1";
  const jobType = type === "Residential" || type === "Commercial" ? type.toUpperCase() : null;

  const jobs = await prisma.job.findMany({
    where: {
      archived: showArchived,
      ...(jobType ? { type: jobType as "RESIDENTIAL" | "COMMERCIAL" } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

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
      </div>

      <JobsView jobs={jobs} showArchived={showArchived} />

      <JobForm />
    </div>
  );
}
