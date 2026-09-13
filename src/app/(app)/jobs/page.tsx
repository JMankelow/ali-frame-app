import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { archiveJob, reactivateJob } from "./actions";
import { JobForm } from "./JobForm";

const STATUS_COLOR: Record<string, string> = {
  New: "blue",
  "In Progress": "purple",
  "On Hold": "orange",
  Complete: "green",
};

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

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Number</th>
              <th>Title</th>
              <th>Address</th>
              <th>Type</th>
              <th>Status</th>
              <th>Supplier</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.number}>
                <td>{job.number}</td>
                <td>{job.title}</td>
                <td>{job.address ?? "—"}</td>
                <td>{job.type === "COMMERCIAL" ? "Commercial" : "Residential"}</td>
                <td>
                  <span className={`status ${STATUS_COLOR[job.status] ?? "grey"}`}>{job.status}</span>
                </td>
                <td>{job.supplier ?? "—"}</td>
                <td>
                  {showArchived ? (
                    <form action={reactivateJob.bind(null, job.number)}>
                      <button type="submit" className="btn light">
                        Reactivate
                      </button>
                    </form>
                  ) : (
                    <form action={archiveJob.bind(null, job.number)}>
                      <button type="submit" className="btn light">
                        Archive
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={7} className="hint">
                  No jobs yet — add the first one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <JobForm />
    </div>
  );
}
