import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FileRow } from "../../files/FileRow";
import { buildSharePointSearchUrl } from "@/lib/sharepoint";
import { JobDetailsCard } from "./JobDetailsCard";

function money(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("en-NZ", { style: "currency", currency: "NZD" });
}

export default async function JobDetailPage({ params }: { params: Promise<{ number: string }> }) {
  await requireUser();
  const { number } = await params;

  const [job, staff] = await Promise.all([
    prisma.job.findUnique({
      where: { number },
      include: { client: true, assignedUser: true, costing: true },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
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
            {job.number} — {job.client?.name ?? job.title}
          </h2>
          <div className="subtitle">
            Everything for this job in one place — files, site measure sketches, and (as they're built) quotes,
            emails and team notes.
          </div>
        </div>
        <div className="actions">
          <a href={buildSharePointSearchUrl(job.number)} target="_blank" rel="noopener noreferrer" className="btn light">
            Find in SharePoint ↗
          </a>
          <Link href="/jobs" className="btn light">
            ← All Jobs
          </Link>
        </div>
      </div>

      <JobDetailsCard
        jobNumber={job.number}
        clientName={job.client?.name ?? ""}
        clientPhone={job.client?.phone ?? ""}
        clientEmail={job.client?.email ?? ""}
        status={job.status}
        type={job.type}
        supplier={job.supplier ?? ""}
        address={job.address ?? ""}
        assignedUserName={job.assignedUser?.name ?? ""}
        assignedUserId={job.assignedUserId ?? ""}
        startDate={job.startDate ? job.startDate.toISOString().slice(0, 10) : ""}
        staff={staff}
      />

      {job.costing && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="label">Costing (from Job Tracking import)</div>
          <div className="form" style={{ marginTop: 10 }}>
            <div>
              <label>Quote No</label>
              <div>{job.costing.quoteNumber ?? "—"}</div>
            </div>
            <div>
              <label>Quoted Total</label>
              <div>{money(job.costing.quotedTotal)}</div>
            </div>
            <div>
              <label>Deposit</label>
              <div>{money(job.costing.deposit)}</div>
            </div>
            <div>
              <label>Materials</label>
              <div>Quoted {money(job.costing.materialsQuoted)} / Actual {money(job.costing.materialsActual)}</div>
            </div>
            <div>
              <label>Rubbish</label>
              <div>Quoted {money(job.costing.rubbishQuoted)} / Actual {money(job.costing.rubbishActual)}</div>
            </div>
            <div>
              <label>Install</label>
              <div>Quoted {money(job.costing.installQuoted)} / Actual {money(job.costing.installActual)}</div>
            </div>
            <div>
              <label>Labour Hours</label>
              <div>Quoted {job.costing.labourHoursQuoted ?? "—"} / Actual {job.costing.labourHoursActual ?? "—"}</div>
            </div>
            <div>
              <label>Margin</label>
              <div>
                {money(job.costing.marginProfit)} profit ({job.costing.marginPct ?? "—"}%)
              </div>
            </div>
            {job.costing.remedialFlag && (
              <>
                <div className="full">
                  <label>Remedial</label>
                  <div>
                    Senior: {job.costing.remedialSeniorName ?? "—"} — Cost {money(job.costing.remedialCost)}, Updated{" "}
                    {money(job.costing.remedialUpdatedCost)} ({job.costing.remedialMarginPct ?? "—"}% margin)
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
