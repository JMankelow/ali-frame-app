"use client";

import Link from "next/link";
import { useState } from "react";
import { archiveJob, reactivateJob } from "./actions";

const STATUS_COLOR: Record<string, string> = {
  New: "blue",
  "In Progress": "purple",
  "On Hold": "orange",
  Complete: "green",
};

export interface JobRow {
  number: string;
  title: string;
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

export function JobsView({ jobs, showArchived }: { jobs: JobRow[]; showArchived: boolean }) {
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  return (
    <div className="card" style={{ padding: viewMode === "card" ? 16 : undefined }}>
      <div className="actions" style={{ marginBottom: 14 }}>
        <button className={`btn ${viewMode === "card" ? "primary" : "light"}`} onClick={() => setViewMode("card")}>
          Card View
        </button>
        <button className={`btn ${viewMode === "table" ? "primary" : "light"}`} onClick={() => setViewMode("table")}>
          Table View
        </button>
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
                <td>{job.title}</td>
                <td>{job.address ?? "—"}</td>
                <td>{job.type === "COMMERCIAL" ? "Commercial" : "Residential"}</td>
                <td>
                  <span className={`status ${STATUS_COLOR[job.status] ?? "grey"}`}>{job.status}</span>
                </td>
                <td>{job.supplier ?? "—"}</td>
                <td>
                  <ArchiveButton job={job} showArchived={showArchived} />
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
      ) : (
        <div className="cards" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {jobs.map((job) => (
            <div key={job.number} className="card jobCard">
              <Link href={`/jobs/${job.number}`} style={{ fontWeight: 900, marginBottom: 8, display: "block", color: "inherit", textDecoration: "none" }}>
                {job.number} — {job.title}
              </Link>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                <span className={`status ${job.type === "COMMERCIAL" ? "green" : "blue"}`}>
                  {job.type === "COMMERCIAL" ? "Commercial" : "Residential"}
                </span>
                <span className={`status ${STATUS_COLOR[job.status] ?? "grey"}`}>{job.status}</span>
              </div>
              <div className="hint">
                {job.address ?? "No address"}
                {job.supplier && <><br />Supplier: {job.supplier}</>}
              </div>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
                <ArchiveButton job={job} showArchived={showArchived} />
              </div>
            </div>
          ))}
          {jobs.length === 0 && <div className="hint">No jobs yet — add the first one below.</div>}
        </div>
      )}
    </div>
  );
}
