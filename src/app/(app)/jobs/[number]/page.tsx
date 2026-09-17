import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FileRow } from "../../files/FileRow";

const STATUS_COLOR: Record<string, string> = {
  New: "blue",
  "In Progress": "purple",
  "On Hold": "orange",
  Complete: "green",
};

export default async function JobDetailPage({ params }: { params: Promise<{ number: string }> }) {
  await requireUser();
  const { number } = await params;

  const job = await prisma.job.findUnique({
    where: { number },
    include: { client: true, assignedUser: true },
  });
  if (!job) notFound();

  const files = await prisma.fileAsset.findMany({
    where: { jobNumber: number },
    include: { uploadedBy: true },
    orderBy: { createdAt: "desc" },
  });
  const siteMeasureFiles = files.filter((f) => f.fileType === "Site Measure");
  const otherFiles = files.filter((f) => f.fileType !== "Site Measure");

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>
            {job.number} — {job.title}
          </h2>
          <div className="subtitle">
            Everything for this job in one place — files, site measure sketches, and (as they're built) quotes,
            emails and team notes.
          </div>
        </div>
        <Link href="/jobs" className="btn light">
          ← All Jobs
        </Link>
      </div>

      <div className="card">
        <div className="label">Job Details</div>
        <div className="form" style={{ marginTop: 10 }}>
          <div>
            <label>Status</label>
            <div>
              <span className={`status ${STATUS_COLOR[job.status] ?? "grey"}`}>{job.status}</span>
            </div>
          </div>
          <div>
            <label>Type</label>
            <div>{job.type === "COMMERCIAL" ? "Commercial" : "Residential"}</div>
          </div>
          <div>
            <label>Supplier</label>
            <div>{job.supplier ?? "—"}</div>
          </div>
          <div>
            <label>Assigned To</label>
            <div>{job.assignedUser?.name ?? "—"}</div>
          </div>
          <div className="full">
            <label>Address</label>
            <div>{job.address ?? "—"}</div>
          </div>
          <div>
            <label>Customer</label>
            <div>{job.client?.name ?? "—"}</div>
          </div>
          <div>
            <label>Customer Phone</label>
            <div>{job.client?.phone ?? "—"}</div>
          </div>
          <div>
            <label>Customer Email</label>
            <div>{job.client?.email ?? "—"}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="topbar" style={{ marginBottom: 8 }}>
          <div className="label">Site Measure Sketches</div>
          <Link href="/site-measure" className="btn light">
            Open Site Measure ↗
          </Link>
        </div>
        {siteMeasureFiles.length === 0 ? (
          <div className="hint">No site measure sketches uploaded for this job yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Job</th>
                <th>Type</th>
                <th>Uploaded By</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {siteMeasureFiles.map((f) => (
                <FileRow
                  key={f.id}
                  id={f.id}
                  name={f.fileName}
                  jobNumber={f.jobNumber}
                  fileType={f.fileType}
                  uploadedByName={f.uploadedBy?.name ?? "—"}
                  date={f.createdAt.toLocaleDateString("en-NZ")}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="topbar" style={{ marginBottom: 8 }}>
          <div className="label">Files</div>
          <Link href="/files" className="btn light">
            Open Files ↗
          </Link>
        </div>
        {otherFiles.length === 0 ? (
          <div className="hint">No other files uploaded for this job yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Uploaded By</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {otherFiles.map((f) => (
                <FileRow
                  key={f.id}
                  id={f.id}
                  name={f.fileName}
                  jobNumber={f.jobNumber}
                  fileType={f.fileType}
                  uploadedByName={f.uploadedBy?.name ?? "—"}
                  date={f.createdAt.toLocaleDateString("en-NZ")}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="label">Quotes, Emails &amp; Team Notes</div>
        <p className="hint" style={{ marginTop: 8 }}>
          Not built yet — once Quotes and email/message history are real features, they'll show up here too, so
          this job page becomes the one place to see everything related to it.
        </p>
      </div>
    </div>
  );
}
