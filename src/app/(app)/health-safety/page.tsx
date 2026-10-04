// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TabStrip } from "@/components/TabStrip";
import { DocContent } from "@/components/DocContent";
import { SafetyIncidentForm } from "./SafetyIncidentForm";
import { PrintButton } from "./PrintButton";
import { OpenSsspForm } from "./OpenSsspForm";
import { resolveSafetyIncident } from "./actions";
import { saveCompetency, archiveCompetency, saveRisk, closeRisk, createJsa, createInduction, saveDocument } from "./hsActions";
import { RISK_LEVELS, RISK_COLOR } from "@/lib/hsDocs";
import { ensureHsDocuments } from "@/lib/hsSeed";
import { isInstallerProfile } from "@/lib/permissions";

const SEVERITY_COLOR: Record<string, string> = { Low: "grey", Medium: "orange", High: "red" };
const fmt = (d: Date | null | undefined) => (d ? d.toLocaleDateString("en-NZ") : "—");
const iso = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");
const daysUntil = (d: Date) => Math.ceil((d.getTime() - Date.now()) / 86400000);

export default async function HealthSafetyPage() {
  const user = await requireUser();
  const isSuper = user.isSuperUser;
  // Field staff can read everything and do pre-starts / task analyses / incident reports, but not edit registers.
  const canManage = !isInstallerProfile(user);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  await ensureHsDocuments();

  const [incidents, jobs, staff, people, risks, preStarts, jsas, sssps, inductions, docs] = await Promise.all([
    prisma.safetyIncident.findMany({ where: { status: "Open" }, include: { reportedBy: true }, orderBy: { createdAt: "desc" } }),
    prisma.job.findMany({ where: { archived: false }, orderBy: { number: "asc" }, select: { number: true, title: true } }),
    prisma.user.findMany({ where: { isActive: true, email: { not: "claude@aliframe.local" } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.hsCompetency.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.hsRisk.findMany({ where: { status: "Open" }, orderBy: { createdAt: "asc" } }),
    prisma.hsPreStart.findMany({ include: { completedBy: true }, orderBy: { date: "desc" }, take: 30 }),
    prisma.hsJsa.findMany({ include: { preparedBy: true }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.hsSssp.findMany({ include: { signOns: true }, orderBy: { updatedAt: "desc" } }),
    prisma.hsInduction.findMany({ include: { user: true }, orderBy: { date: "desc" }, take: 50 }),
    prisma.hsDocument.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const expired = people.filter((p) => p.expiryDate && p.expiryDate < today);
  const expiring = people.filter((p) => p.expiryDate && p.expiryDate >= today && daysUntil(p.expiryDate) <= 60);
  const overdueRisks = risks.filter((r) => r.reviewDate && r.reviewDate < today);
  const preStartsToday = preStarts.filter((p) => p.date >= startOfToday).length;
  const criticalRisks = risks.filter((r) => r.residualRisk === "CRITICAL" || r.residualRisk === "HIGH");
  const unapprovedDocs = docs.filter((d) => !d.status.startsWith("APPROVED"));

  const jobOptions = jobs.map((j) => (
    <option key={j.number} value={j.number}>
      {j.number} — {j.title}
    </option>
  ));
  const staffOptions = staff.map((s) => (
    <option key={s.id} value={s.id}>
      {s.name}
    </option>
  ));
  const riskSelect = (name: string, def: string) => (
    <select name={name} defaultValue={def}>
      {RISK_LEVELS.map((l) => <option key={l}>{l}</option>)}
    </select>
  );

  // ---------------- Overview ----------------
  const attention: string[] = [
    ...expired.map((p) => `${p.name}: ticket/licence EXPIRED ${fmt(p.expiryDate)} (${p.siteSafeNumber ?? "no number"}) — check the register`),
    ...expiring.map((p) => `${p.name}: ticket/licence expires ${fmt(p.expiryDate)} (${daysUntil(p.expiryDate!)} days)`),
    ...overdueRisks.map((r) => `Risk review overdue: ${r.activity} (was due ${fmt(r.reviewDate)})`),
    ...incidents.map((i) => `Open ${i.type.toLowerCase()} (${i.severity}): ${i.description.slice(0, 80)}`),
    ...(preStartsToday === 0 ? ["No pre-start recorded yet today."] : []),
    ...(unapprovedDocs.length ? [`${unapprovedDocs.length} company H&S document(s) still marked pending Organisation review (Documents tab).`] : []),
  ];
  const overview = (
    <div>
      <div className="cards">
        <div className="card"><div className="label">Open incidents / hazards</div><div className="metric">{incidents.length}</div></div>
        <div className="card"><div className="label">Tickets expired</div><div className="metric" style={{ color: expired.length ? "#dc2626" : undefined }}>{expired.length}</div></div>
        <div className="card"><div className="label">Expiring ≤ 60 days</div><div className="metric">{expiring.length}</div></div>
        <div className="card"><div className="label">Pre-starts today</div><div className="metric">{preStartsToday}</div></div>
        <div className="card"><div className="label">High / critical residual risks</div><div className="metric">{criticalRisks.length}</div></div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="label">Needs attention</div>
        {attention.length === 0 ? (
          <div className="hint" style={{ marginTop: 8 }}>Nothing outstanding.</div>
        ) : (
          <ul style={{ marginTop: 8, paddingLeft: 18 }}>
            {attention.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        )}
      </div>
    </div>
  );

  // ---------------- Pre-starts ----------------
  const preStartTab = (
    <div>
      <div className="card">
        <div className="label">Daily Pre-start</div>
        <div className="hint" style={{ marginTop: 4 }}>
          Site and weather, hazard check, today&apos;s hazards and controls, and crew sign-on. A &ldquo;No&rdquo; on a critical check means stop work.
        </div>
        <div className="actions" style={{ marginTop: 10 }}>
          <Link href="/health-safety/prestart" className="btn primary">Start today&apos;s pre-start</Link>
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="label">Recent Pre-starts</div>
        <table style={{ marginTop: 8 }}>
          <thead><tr><th>Date</th><th>Site / job</th><th>Completed by</th><th>Crew</th><th>Result</th><th>Notes</th></tr></thead>
          <tbody>
            {preStarts.map((p) => {
              const fails = Object.values(p.checks as Record<string, string>).filter((v) => v === "Fail").length;
              return (
                <tr key={p.id}>
                  <td>{fmt(p.date)}{p.startTime ? " " + p.startTime : ""}</td><td>{p.jobNumber ? p.jobNumber + " · " : ""}{p.siteAddress ?? "—"}</td><td>{p.completedBy.name}</td><td>{p.crewNames ?? "—"}</td>
                  <td>{p.stopWork ? <span className="status red">STOP WORK</span> : fails ? <span className="status orange">{fails} fail</span> : <span className="status green">All clear</span>}</td><td>{p.issues ?? "—"}</td>
                </tr>
              );
            })}
            {preStarts.length === 0 && <tr><td colSpan={6} className="hint">None recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ---------------- Task Analysis (JSA) ----------------
  const jsaTab = (
    <div>
      <div className="card">
        <div className="label">New Task Analysis (JSA)</div>
        <div className="hint" style={{ marginTop: 4 }}>Rate each step CRITICAL / HIGH / MEDIUM / LOW. CRITICAL = stop work until the risk is reduced and management approves.</div>
        <form action={createJsa} style={{ marginTop: 10 }}>
          <div className="form">
            <div><label>Job</label><select name="jobNumber" required defaultValue=""><option value="" disabled>— Select —</option>{jobOptions}</select></div>
            <div><label>Task</label><input name="task" required placeholder="e.g. Remove and replace window units" /></div>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="full" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 110px 1fr", gap: 8 }}>
                <input name={`step${i}`} placeholder={`Step ${i}`} />
                <input name={`hazard${i}`} placeholder="Hazard" />
                <select name={`risk${i}`} defaultValue=""><option value="">Risk</option>{RISK_LEVELS.map((l) => <option key={l}>{l}</option>)}</select>
                <input name={`control${i}`} placeholder="Control" />
              </div>
            ))}
          </div>
          <div className="actions" style={{ marginTop: 12 }}><button className="btn primary" type="submit">Save Task Analysis</button></div>
        </form>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="label">Issued Task Analyses</div>
        <table style={{ marginTop: 8 }}>
          <thead><tr><th>Date</th><th>Job</th><th>Task</th><th>Steps</th><th>Prepared by</th></tr></thead>
          <tbody>
            {jsas.map((j) => (
              <tr key={j.id}><td>{fmt(j.createdAt)}</td><td>{j.jobNumber}</td><td>{j.task}</td><td>{(j.steps as unknown[]).length}</td><td>{j.preparedBy.name}</td></tr>
            ))}
            {jsas.length === 0 && <tr><td colSpan={5} className="hint">None yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ---------------- SSSP ----------------
  const ssspTab = (
    <div>
      <div className="card">
        <div className="label">Site Specific Safety Plan</div>
        <div className="hint" style={{ marginTop: 4 }}>
          One per job. Fill in the site agreement, record sign-offs and worker sign-on, then print the full pack (policy, procedures, PPE, emergency plan, training register) as a PDF for the Main Contractor.
        </div>
        {canManage && <div style={{ marginTop: 10 }}><OpenSsspForm jobs={jobs} /></div>}
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <table>
          <thead><tr><th>Job</th><th>Main Contractor</th><th>Status</th><th>Workers signed on</th><th>Updated</th><th></th></tr></thead>
          <tbody>
            {sssps.map((s) => (
              <tr key={s.id}>
                <td>{s.jobNumber}</td><td>{s.mainContractor ?? "—"}</td>
                <td><span className={`status ${s.status === "Approved to start" ? "green" : "orange"}`}>{s.status}</span></td>
                <td>{s.signOns.length}</td><td>{fmt(s.updatedAt)}</td>
                <td><Link href={`/health-safety/sssp/${encodeURIComponent(s.jobNumber)}`} className="btn light">Open</Link></td>
              </tr>
            ))}
            {sssps.length === 0 && <tr><td colSpan={6} className="hint">No SSSPs yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ---------------- Incidents ----------------
  const incidentsTab = (
    <div>
      <div className="card">
        <table>
          <thead><tr><th>Type</th><th>Severity</th><th>Job</th><th>Description</th><th>Reported By</th><th>Date</th><th></th></tr></thead>
          <tbody>
            {incidents.map((item) => (
              <tr key={item.id}>
                <td>{item.type}</td>
                <td><span className={`status ${SEVERITY_COLOR[item.severity] ?? "grey"}`}>{item.severity}</span></td>
                <td>{item.jobNumber ?? "—"}</td>
                <td style={{ whiteSpace: "pre-wrap" }}>{item.description}</td>
                <td>{item.reportedBy.name}</td>
                <td>{fmt(item.createdAt)}</td>
                <td>
                  {canManage && (
<form action={resolveSafetyIncident.bind(null, item.id)} className="actions">
                    <input name="actionTaken" placeholder="Action taken (optional)" style={{ width: 160 }} />
                    <button type="submit" className="btn light">Resolve</button>
                  </form>
)}
                </td>
              </tr>
            ))}
            {incidents.length === 0 && <tr><td colSpan={7} className="hint">No open incidents, near misses or hazards.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="hint" style={{ marginTop: 8 }}>
        Notifiable events under the Health and Safety at Work Act 2015: call 111 if needed, notify WorkSafe NZ as soon as possible, and preserve the scene.
      </div>
      <SafetyIncidentForm jobs={jobs} />
    </div>
  );

  // ---------------- Training & Competency ----------------
  const competencyFields = (p?: (typeof people)[number]) => (
    <div className="form">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div><label>Name</label><input name="name" required defaultValue={p?.name ?? ""} /></div>
      <div><label>App user (optional)</label><select name="userId" defaultValue={p?.userId ?? ""}><option value="">— Not an app user —</option>{staffOptions}</select></div>
      <div><label>Site Safe / licence no.</label><input name="siteSafeNumber" defaultValue={p?.siteSafeNumber ?? ""} /></div>
      <div><label>Expiry date</label><input type="date" name="expiryDate" defaultValue={iso(p?.expiryDate)} /></div>
      <div><label>Key role</label><input name="keyRole" defaultValue={p?.keyRole ?? ""} /></div>
      <div><label>Years experience</label><input name="yearsExperience" defaultValue={p?.yearsExperience ?? ""} /></div>
      <div className="full"><label>Training, licences &amp; qualifications</label><input name="qualifications" defaultValue={p?.qualifications ?? ""} /></div>
      <div><label>Competency (1–5)</label><select name="competency" defaultValue={p?.competency ?? ""}><option value="">—</option>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select></div>
    </div>
  );
  const workersTab = (
    <div>
      <div className="card">
        <div className="label">Training &amp; Competency Register</div>
        <div className="hint" style={{ marginTop: 4 }}>Expiry is the main ticket expiry (Site Safe, or licence for LBPs). This register is printed in every SSSP.</div>
        <table style={{ marginTop: 8 }}>
          <thead><tr><th>Name</th><th>Role</th><th>No.</th><th>Qualifications</th><th>Expiry</th><th>Yrs</th><th>Comp.</th><th></th></tr></thead>
          <tbody>
            {people.map((p) => {
              const exp = p.expiryDate && p.expiryDate < today;
              const soon = p.expiryDate && !exp && daysUntil(p.expiryDate) <= 60;
              return (
                <tr key={p.id}>
                  <td>{p.name}</td><td>{p.keyRole ?? "—"}</td><td>{p.siteSafeNumber ?? "—"}</td><td>{p.qualifications ?? "—"}</td>
                  <td>
                    {p.expiryDate ? (
                      <span className={`status ${exp ? "red" : soon ? "orange" : "green"}`}>{fmt(p.expiryDate)}{exp ? " — expired" : ""}</span>
                    ) : "—"}
                  </td>
                  <td>{p.yearsExperience ?? "—"}</td><td>{p.competency ?? "—"}</td>
                  <td>
                    {canManage && (
<details>
                      <summary className="btn light" style={{ display: "inline-block", cursor: "pointer" }}>Edit</summary>
                      <form action={saveCompetency} style={{ marginTop: 8, minWidth: 420 }}>
                        {competencyFields(p)}
                        <div className="actions" style={{ marginTop: 8 }}><button className="btn primary" type="submit">Save</button></div>
                      </form>
                      <form action={archiveCompetency.bind(null, p.id)} style={{ marginTop: 6 }}>
                        <button className="btn light" type="submit">Archive (inactive)</button>
                      </form>
                    </details>
)}
                  </td>
                </tr>
              );
            })}
            {people.length === 0 && <tr><td colSpan={8} className="hint">No one on the register yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {canManage && (
<div className="card" style={{ marginTop: 16 }}>
        <div className="label">Add person</div>
        <form action={saveCompetency} style={{ marginTop: 10 }}>
          {competencyFields()}
          <div className="actions" style={{ marginTop: 12 }}><button className="btn primary" type="submit">Add to Register</button></div>
        </form>
      </div>
)}
    </div>
  );

  // ---------------- Inductions ----------------
  const inductionsTab = (
    <div>
      {canManage && (
<div className="card">
        <div className="label">Record Induction</div>
        <form action={createInduction} style={{ marginTop: 10 }}>
          <div className="form">
            <div><label>Worker</label><select name="userId" required defaultValue=""><option value="" disabled>— Select —</option>{staffOptions}</select></div>
            <div><label>Date</label><input type="date" name="date" defaultValue={iso(today)} /></div>
            <div><label>Job (optional)</label><select name="jobNumber" defaultValue=""><option value="">— General / company —</option>{jobOptions}</select></div>
            <div><label>Site / topic</label><input name="siteName" /></div>
            <div><label>Inducted by</label><input name="inductedBy" defaultValue={user.name} /></div>
            <div><label>Notes</label><input name="notes" /></div>
          </div>
          <div className="actions" style={{ marginTop: 12 }}><button className="btn primary" type="submit">Record Induction</button></div>
        </form>
      </div>
)}
      <div className="card" style={{ marginTop: 16 }}>
        <table>
          <thead><tr><th>Date</th><th>Worker</th><th>Job</th><th>Site / topic</th><th>Inducted by</th></tr></thead>
          <tbody>
            {inductions.map((i) => (
              <tr key={i.id}><td>{fmt(i.date)}</td><td>{i.user.name}</td><td>{i.jobNumber ?? "—"}</td><td>{i.siteName ?? "—"}</td><td>{i.inductedBy}</td></tr>
            ))}
            {inductions.length === 0 && <tr><td colSpan={5} className="hint">None recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ---------------- Risk Register ----------------
  const riskTab = (
    <div>
      <div className="card">
        <div className="label">Company Hazard &amp; Risk Register</div>
        <div className="hint" style={{ marginTop: 4 }}>
          CRITICAL — stop work until reduced, management approval to resume · HIGH — controls in place before work begins · MEDIUM — controls planned and monitored · LOW — routine controls.
        </div>
        <table style={{ marginTop: 8 }}>
          <thead><tr><th>Task / Activity</th><th>Hazard</th><th>Potential Harm</th><th>Initial</th><th>Controls</th><th>Residual</th><th>Review</th><th></th></tr></thead>
          <tbody>
            {risks.map((r) => (
              <tr key={r.id}>
                <td>{r.activity}</td><td>{r.hazard}</td><td>{r.potentialHarm ?? "—"}</td>
                <td><span className={`status ${RISK_COLOR[r.initialRisk] ?? "grey"}`}>{r.initialRisk}</span></td>
                <td style={{ whiteSpace: "pre-wrap" }}>{r.controls}</td>
                <td><span className={`status ${RISK_COLOR[r.residualRisk] ?? "grey"}`}>{r.residualRisk}</span></td>
                <td>{fmt(r.reviewDate)}</td>
                <td>{canManage && <form action={closeRisk.bind(null, r.id)}><button className="btn light" type="submit">Close</button></form>}</td>
              </tr>
            ))}
            {risks.length === 0 && <tr><td colSpan={8} className="hint">No open risks recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {canManage && (
<div className="card" style={{ marginTop: 16 }}>
        <div className="label">Add Risk</div>
        <form action={saveRisk} style={{ marginTop: 10 }}>
          <div className="form">
            <div><label>Task / activity</label><input name="activity" required /></div>
            <div><label>Hazard</label><input name="hazard" required /></div>
            <div className="full"><label>Potential harm</label><input name="potentialHarm" /></div>
            <div><label>Initial risk</label>{riskSelect("initialRisk", "HIGH")}</div>
            <div><label>Residual risk</label>{riskSelect("residualRisk", "LOW")}</div>
            <div className="full"><label>Control measures</label><textarea name="controls" rows={2} required /></div>
            <div><label>Owner</label><input name="ownerName" /></div>
            <div><label>Review date</label><input type="date" name="reviewDate" /></div>
          </div>
          <div className="actions" style={{ marginTop: 12 }}><button className="btn primary" type="submit">Add Risk</button></div>
        </form>
      </div>
)}
    </div>
  );

  // ---------------- Documents ----------------
  const docsTab = (
    <div>
      <div className="hint" style={{ marginBottom: 8 }}>
        These are Ali-Frame&apos;s own documents, loaded from the signed Word versions. They stay marked &ldquo;pending Organisation review&rdquo; until a super user ticks the approval box on that document.
      </div>
      {docs.map((d) => {
        const approved = d.status.startsWith("APPROVED");
        return (
          <details key={d.slug} className="card" style={{ marginTop: 10 }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>
              {d.title} <span className="hint" style={{ fontWeight: 400 }}>· {d.version ?? ""} · next review {fmt(d.nextReviewDate)} ·</span>{" "}
              <span className={`status ${approved ? "green" : "orange"}`}>{d.status}</span>
            </summary>
            <div style={{ marginTop: 10 }}>
              <PrintButton />
              {isSuper ? (
                <form action={saveDocument.bind(null, d.slug)} style={{ marginTop: 10 }}>
                  <div className="form">
                    <div><label>Version</label><input name="version" defaultValue={d.version ?? ""} /></div>
                    <div><label>Effective date</label><input type="date" name="effectiveDate" defaultValue={iso(d.effectiveDate)} /></div>
                    <div><label>Next review</label><input type="date" name="nextReviewDate" defaultValue={iso(d.nextReviewDate)} /></div>
                    <div className="full"><label>Content (&quot;## &quot; heading, &quot;- &quot; bullet, &quot;| a | b |&quot; table row)</label><textarea name="content" rows={18} defaultValue={d.content} style={{ width: "100%" }} /></div>
                    <div className="full">
                      <label style={{ fontWeight: 400, display: "flex", gap: 6, alignItems: "center" }}>
                        <input type="checkbox" name="approved" defaultChecked={approved} /> I confirm this document has been reviewed and approved by the business
                      </label>
                    </div>
                  </div>
                  <div className="actions" style={{ marginTop: 12 }}><button className="btn primary" type="submit">Save</button></div>
                </form>
              ) : (
                <div style={{ marginTop: 10 }}><DocContent content={d.content} /></div>
              )}
              {isSuper && <div style={{ marginTop: 12 }}><div className="label">Preview</div><DocContent content={d.content} /></div>}
            </div>
          </details>
        );
      })}
      <div className="hint" style={{ marginTop: 12 }}>© 2026 BLB Consultants Limited T/A Ali-Frame Windows &amp; Doors — Confidential</div>
    </div>
  );

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Health &amp; Safety</h2>
          <div className="subtitle">Pre-starts, task analyses, site safety plans, incidents, training, inductions, risks and company documents.</div>
        </div>
      </div>
      <TabStrip
        tabs={[
          { key: "overview", label: "Overview", content: overview },
          { key: "prestarts", label: "Pre-starts", content: preStartTab },
          { key: "jsa", label: "Task Analysis (JSA)", content: jsaTab },
          { key: "sssp", label: "SSSP", content: ssspTab },
          { key: "incidents", label: `Incidents (${incidents.length})`, content: incidentsTab },
          { key: "workers", label: "Training & Competency", content: workersTab },
          { key: "inductions", label: "Inductions", content: inductionsTab },
          { key: "risks", label: "Risk Register", content: riskTab },
          { key: "documents", label: "Documents", content: docsTab },
        ]}
      />
    </div>
  );
}
