// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { JOB_LEAD_SOURCES } from "@/lib/jobStatus";

const NONE = "Not recorded";
const money = (n: number) => `$${Math.round(n).toLocaleString("en-NZ")}`;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Marketing report: where jobs are coming from ("How did they hear about us?"), filterable by date and job type. */
export default async function LeadSourcesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const from = first(sp.from);
  const to = first(sp.to);
  const type = first(sp.type);
  const source = first(sp.source);

  const createdAt: { gte?: Date; lte?: Date } = {};
  if (from) createdAt.gte = new Date(`${from}T00:00:00`);
  if (to) createdAt.lte = new Date(`${to}T23:59:59`);

  const jobs = await prisma.job.findMany({
    where: {
      ...(from || to ? { createdAt } : {}),
      ...(type === "RESIDENTIAL" || type === "COMMERCIAL" ? { type } : {}),
    },
    select: {
      number: true, title: true, type: true, status: true, leadSource: true, createdAt: true,
      costing: { select: { dateAccepted: true, quotedTotal: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = new Map<string, { jobs: number; accepted: number; value: number }>();
  for (const s of JOB_LEAD_SOURCES) rows.set(s, { jobs: 0, accepted: 0, value: 0 });
  for (const j of jobs) {
    const key = j.leadSource || NONE;
    const r = rows.get(key) ?? { jobs: 0, accepted: 0, value: 0 };
    r.jobs += 1;
    if (j.costing?.dateAccepted) {
      r.accepted += 1;
      r.value += j.costing.quotedTotal ?? 0;
    }
    rows.set(key, r);
  }
  const table = [...rows.entries()].filter(([, r]) => r.jobs > 0).sort((a, b) => b[1].jobs - a[1].jobs);
  const total = jobs.length;
  const recorded = jobs.filter((j) => j.leadSource).length;
  const max = Math.max(1, ...table.map(([, r]) => r.jobs));
  const detail = source ? jobs.filter((j) => (j.leadSource || NONE) === source) : [];
  const q = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ ...(from && { from }), ...(to && { to }), ...(type && { type }), ...extra });
    return `/marketing/lead-sources?${p.toString()}`;
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Lead Sources</h2>
          <div className="subtitle">Where our jobs are coming from — from &ldquo;How did they hear about us?&rdquo; on each job.</div>
        </div>
      </div>

      <form method="get" className="card form" style={{ marginTop: 12 }}>
        <div>
          <label htmlFor="from">Job created from</label>
          <input id="from" type="date" name="from" defaultValue={from} />
        </div>
        <div>
          <label htmlFor="to">to</label>
          <input id="to" type="date" name="to" defaultValue={to} />
        </div>
        <div>
          <label htmlFor="type">Job type</label>
          <select id="type" name="type" defaultValue={type}>
            <option value="">All</option>
            <option value="RESIDENTIAL">Residential</option>
            <option value="COMMERCIAL">Commercial</option>
          </select>
        </div>
        <div className="actions" style={{ alignSelf: "end" }}>
          <button type="submit" className="btn primary">Filter</button>
          <Link href="/marketing/lead-sources" className="btn light">Clear</Link>
        </div>
      </form>

      {recorded < total && (
        <div className="hint" style={{ marginTop: 12 }}>
          {total - recorded} of {total} jobs have no lead source recorded yet — set it on the job (&ldquo;How Did They Hear About Us?&rdquo;) or when adding a job so this report fills in.
        </div>
      )}

      <div className="card" style={{ marginTop: 12 }}>
        <table>
          <thead>
            <tr>
              <th>Lead source</th>
              <th></th>
              <th style={{ textAlign: "right" }}>Jobs</th>
              <th style={{ textAlign: "right" }}>Accepted</th>
              <th style={{ textAlign: "right" }}>Conversion</th>
              {user.isSuperUser && <th style={{ textAlign: "right" }}>Accepted value (excl. GST)</th>}
            </tr>
          </thead>
          <tbody>
            {table.map(([name, r]) => (
              <tr key={name}>
                <td><Link href={q({ source: name })} style={{ fontWeight: 700, color: "var(--blueDark)", textDecoration: "none" }}>{name}</Link></td>
                <td style={{ width: "30%" }}>
                  <div style={{ background: "#eef2f7", borderRadius: 6, height: 12 }}>
                    <div style={{ width: `${(r.jobs / max) * 100}%`, background: "#0057b8", height: 12, borderRadius: 6, minWidth: 4 }} />
                  </div>
                </td>
                <td style={{ textAlign: "right" }}>{r.jobs}</td>
                <td style={{ textAlign: "right" }}>{r.accepted}</td>
                <td style={{ textAlign: "right" }}>{r.jobs ? `${Math.round((r.accepted / r.jobs) * 100)}%` : "—"}</td>
                {user.isSuperUser && <td style={{ textAlign: "right", fontWeight: 700 }}>{money(r.value)}</td>}
              </tr>
            ))}
            {table.length === 0 && <tr><td className="hint">No jobs match these filters.</td></tr>}
          </tbody>
        </table>
      </div>

      {source && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="label">{source} — {detail.length} job{detail.length === 1 ? "" : "s"}</div>
          <table style={{ marginTop: 8 }}>
            <tbody>
              {detail.map((j) => (
                <tr key={j.number}>
                  <td><Link href={`/jobs/${j.number}`} style={{ fontWeight: 800, color: "var(--blueDark)", textDecoration: "none" }}>{j.number} — {j.title}</Link></td>
                  <td><span className="status blue">{j.type === "COMMERCIAL" ? "Commercial" : "Residential"}</span></td>
                  <td>{j.status}</td>
                  <td className="hint">{j.createdAt.toLocaleDateString("en-NZ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
