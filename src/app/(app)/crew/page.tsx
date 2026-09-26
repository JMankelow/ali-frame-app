import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { JOB_STATUS_COLOR as STATUS_COLOR } from "@/lib/jobStatus";

export default async function CrewPage() {
  const user = await requireUser();

  const jobs = await prisma.job.findMany({
    where: { archived: false, assignedUserId: user.id },
    include: { client: true },
    orderBy: { dueDate: "asc" },
  });

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>My Jobs</h2>
          <div className="subtitle">A simple mobile-friendly view of what&apos;s assigned to you — {jobs.length} active job(s).</div>
        </div>
      </div>

      {jobs.length === 0 && (
        <div className="card">
          <div className="hint">Nothing assigned to you right now.</div>
        </div>
      )}

      {jobs.map((j) => (
        <Link key={j.number} href={`/jobs/${j.number}`} className="card" style={{ display: "block", marginTop: 12, textDecoration: "none", color: "inherit" }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>
            {j.number} — {j.title}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            <span className={`status ${STATUS_COLOR[j.status] ?? "grey"}`}>{j.status}</span>
            {j.dueDate && <span className="status blue">Due {j.dueDate.toLocaleDateString("en-NZ")}</span>}
          </div>
          <div className="hint">
            {j.client?.name ?? "—"}
            {j.address && <><br />{j.address}</>}
          </div>
        </Link>
      ))}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="actions">
          <Link href="/timesheets" className="btn primary">
            Log Time
          </Link>
        </div>
      </div>
    </div>
  );
}
