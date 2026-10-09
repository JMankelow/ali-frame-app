// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireNotInstaller } from "@/lib/session";

/** Completed jobs that have photos — pick one to prepare a social media post. */
export default async function JobPostsPage() {
  await requireNotInstaller();
  const jobs = await prisma.job.findMany({
    where: { status: "Completed", files: { some: { fileType: "Photos", mimeType: { startsWith: "image/" } } } },
    select: {
      number: true, title: true, type: true, supplier: true, updatedAt: true,
      _count: { select: { files: { where: { fileType: "Photos", mimeType: { startsWith: "image/" } } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Job Posts</h2>
          <div className="subtitle">Completed jobs with photos — click one to choose photos and prepare a post for Buffer.</div>
        </div>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <table>
          <thead>
            <tr><th>Job</th><th>Type</th><th>Supplier</th><th style={{ textAlign: "right" }}>Photos</th><th>Completed / updated</th></tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.number}>
                <td><Link href={`/marketing/job-posts/${j.number}`} style={{ fontWeight: 600, color: "var(--blueDark)", textDecoration: "none" }}>{j.number} — {j.title}</Link></td>
                <td><span className="status blue">{j.type === "COMMERCIAL" ? "Commercial" : "Residential"}</span></td>
                <td>{j.supplier ?? "—"}</td>
                <td style={{ textAlign: "right" }}>{j._count.files}</td>
                <td className="hint">{j.updatedAt.toLocaleDateString("en-NZ")}</td>
              </tr>
            ))}
            {jobs.length === 0 && <tr><td className="hint">No completed jobs with photos yet. Photos go on the job&apos;s Photos tab; set the job status to Completed.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
