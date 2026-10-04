// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OpenSsspForm({ jobs }: { jobs: { number: string; title: string }[] }) {
  const router = useRouter();
  const [job, setJob] = useState("");
  return (
    <div className="actions">
      <select value={job} onChange={(e) => setJob(e.target.value)} style={{ minWidth: 280 }}>
        <option value="">— Select job —</option>
        {jobs.map((j) => (
          <option key={j.number} value={j.number}>
            {j.number} — {j.title}
          </option>
        ))}
      </select>
      <button type="button" className="btn primary" disabled={!job} onClick={() => router.push(`/health-safety/sssp/${encodeURIComponent(job)}`)}>
        Open / Create SSSP
      </button>
    </div>
  );
}
