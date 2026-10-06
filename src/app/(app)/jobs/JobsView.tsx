"use client";

import Link from "next/link";
import { useState } from "react";
import { archiveJob, reactivateJob } from "./actions";
import { JOB_STATUS_COLOR } from "@/lib/jobStatus";
import { jobStatusStyle } from "@/lib/statusColors";
import { AddressLink } from "@/components/AddressLink";

export interface JobRow {
  number: string;
  title: string;
  clientName: string | null;
  address: string | null;
  type: "RESIDENTIAL" | "COMMERCIAL";
  status: string;
  supplier: string | null;
}

function ArchiveButton({ job, showArchived }: { job: JobRow; showArchived: boolean }) {
  return showArchived ? (
    <form action={reactivateJob.bind(null, job.number)} onClick={(e) => e.stopPropagation()}>
      <button type="submit" className="btn light">
        Reactivate
      </button>
    </form>
  ) : (
    <form action={archiveJob.bind(null, job.number)} onClick={(e) => e.stopPropagation()}>
      <button type="submit" className="btn light">
        Archive
      </button>
    </form>
  );
}

export function JobsView({ jobs: allJobs, showArchived, canManage = true }: { jobs: JobRow[]; showArchived: boolean; canManage?: boolean }) {
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [q, setQ] = useState("");
  // Search across number, title, client, address, supplier, type and status — every word typed has to match somewhere.
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const jobs = words.length
    ? allJobs.filter((j) => {
        const hay = [j.number, j.title, j.clientName, j.address, j.supplier, j.status, j.type === "COMMERCIAL" ? "commercial" : "residential"].join(" ").toLowerCase();
        return words.every((w) => hay.includes(w));
      })
    : allJobs;

  return (
    <div className="card" style={{ padding: viewMode === "card" ? 16 : undefined }}>
      <div className="actions" style={{ marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <button className={`btn ${viewMode === "card" ? "primary" : "light"}`} onClick={() => setViewMode("card")}>
          Card View
        </button>
        <button className={`btn ${viewMode === "table" ? "primary" : "light"}`} onClick={() => setViewMode("table")}>
          Table View
        </button>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search jobs — number, client, address, supplier, status…"
          aria-label="Search jobs"
          style={{ flex: "1 1 280px", minWidth: 220 }}
        />
        {q && <button type="button" className="btn light" onClick={() => setQ("")}>Clear</button>}
        <span className="hint">{jobs.length === allJobs.length ? `${allJobs.length} jobs` : `${jobs.length} of ${allJobs.length} jobs`}</span>
      </div>

      {viewMode === "table" ? (
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
                <td>
                  <Link href={`/jobs/${job.number}`} style={{ color: "var(--blueDark)", fontWeight: 800, textDecoration: "none" }}>
                    {job.number}
                  </Link>
                </td>
                <td>{job.clientName ?? job.title}</td>
                <td><AddressLink address={job.address} /></td>
                <td>{job.type === "COMMERCIAL" ? "Commercial" : "Residential"}</td>
                <td>
                  <span className={`status ${JOB_STATUS_COLOR[job.status] ?? "grey"}`} style={jobStatusStyle(job.status)}>{job.status}</span>
                </td>
                <td>{job.supplier ?? "—"}</td>
                <td>{canManage && <ArchiveButton job={job} showArchived={showArchived} />}</td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={7} className="hint">
                  {q ? "No jobs match your search." : "No jobs yet — add the first one below."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      ) : (
        <div className="cards" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {jobs.map((job) => (
            <div key={job.number} className="card jobCard">
              <Link href={`/jobs/${job.number}`} style={{ fontWeight: 900, marginBottom: 8, display: "block", color: "inherit", textDecoration: "none" }}>
                {job.number} — {job.clientName ?? job.title}
              </Link>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                <span className={`status ${job.type === "COMMERCIAL" ? "green" : "blue"}`}>
                  {job.type === "COMMERCIAL" ? "Commercial" : "Residential"}
                </span>
                <span className={`status ${JOB_STATUS_COLOR[job.status] ?? "grey"}`} style={jobStatusStyle(job.status)}>{job.status}</span>
              </div>
              <div className="hint">
                <AddressLink address={job.address} fallback="No address" />
                {job.supplier && <><br />Supplier: {job.supplier}</>}
              </div>
              {canManage && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
                  <ArchiveButton job={job} showArchived={showArchived} />
                </div>
              )}
            </div>
          ))}
          {jobs.length === 0 && <div className="hint">{q ? "No jobs match your search." : "No jobs yet — add the first one below."}</div>}
        </div>
      )}
    </div>
  );
}
