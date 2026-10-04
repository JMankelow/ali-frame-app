// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { isInstallerProfile } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { DocContent } from "@/components/DocContent";
import { ensureHsDocuments } from "@/lib/hsSeed";
import { DEFAULT_SSSP_ACTIVITIES, RISK_COLOR } from "@/lib/hsDocs";
import { PrintButton } from "../../PrintButton";
import { saveSssp, addSsspSignOn } from "../../hsActions";

const fmt = (d: Date | null | undefined) => (d ? d.toLocaleDateString("en-NZ") : "");
const iso = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

export default async function SsspPage({ params }: { params: Promise<{ jobNumber: string }> }) {
  const me = await requireUser();
  const canManage = !isInstallerProfile(me);
  const { jobNumber: raw } = await params;
  const jobNumber = decodeURIComponent(raw);
  const job = await prisma.job.findUnique({ where: { number: jobNumber }, include: { client: true } });
  if (!job) notFound();

  await ensureHsDocuments();
  const [sssp, docs, risks, people] = await Promise.all([
    prisma.hsSssp.findUnique({ where: { jobNumber }, include: { signOns: { orderBy: { createdAt: "asc" } } } }),
    prisma.hsDocument.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.hsRisk.findMany({ where: { status: "Open" }, orderBy: { createdAt: "asc" } }),
    prisma.hsCompetency.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const doc = (slug: string) => docs.find((d) => d.slug === slug);
  const section = (slug: string) => {
    const d = doc(slug);
    return d ? (
      <section className="card pagebreak" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>{d.title}</h3>
        <DocContent content={d.content} />
      </section>
    ) : null;
  };

  const v = {
    siteAddress: sssp?.siteAddress ?? job.address ?? "",
    siteActivities: sssp?.siteActivities ?? DEFAULT_SSSP_ACTIVITIES,
    pcbu2ProjectManager: sssp?.pcbu2ProjectManager ?? "Kere Taaka Tekaute · 021 223 5833 · kere@aliframe.co.nz",
    pcbu2SiteManager: sssp?.pcbu2SiteManager ?? "Kere Taaka Tekaute",
    pcbu2HsRep: sssp?.pcbu2HsRep ?? "Tanya Cleghorn · 027 231 8160 · tanya@aliframe.co.nz",
  };

  return (
    <div>
      <div className="topbar no-print">
        <div>
          <h2>Site Specific Safety Plan — {job.number}</h2>
          <div className="subtitle">{job.client?.name ?? job.title} · {job.address ?? "no address"}</div>
        </div>
        <div className="actions">
          <PrintButton label="Print full SSSP / Save PDF" />
          <Link href="/health-safety" className="btn light">← Health &amp; Safety</Link>
        </div>
      </div>

      {canManage && (
<form action={saveSssp} className="card no-print">
        <input type="hidden" name="jobNumber" value={jobNumber} />
        <div className="label">Site agreement</div>
        <div className="form" style={{ marginTop: 10 }}>
          <div className="full"><label>Site address</label><input name="siteAddress" defaultValue={v.siteAddress} /></div>
          <div className="full"><label>Site activities this agreement covers</label><textarea name="siteActivities" rows={2} defaultValue={v.siteActivities} /></div>
          <div className="full"><label>Main Contractor (PCBU 1) — business name</label><input name="mainContractor" defaultValue={sssp?.mainContractor ?? ""} /></div>
          <div><label>PCBU 1 Project Manager</label><input name="pcbu1ProjectManager" defaultValue={sssp?.pcbu1ProjectManager ?? ""} /></div>
          <div><label>PCBU 1 Site Manager</label><input name="pcbu1SiteManager" defaultValue={sssp?.pcbu1SiteManager ?? ""} /></div>
          <div className="full"><label>PCBU 1 Health &amp; Safety Representative</label><input name="pcbu1HsRep" defaultValue={sssp?.pcbu1HsRep ?? ""} /></div>
          <div><label>PCBU 2 (Ali-Frame) Project Manager</label><input name="pcbu2ProjectManager" defaultValue={v.pcbu2ProjectManager} /></div>
          <div><label>PCBU 2 Site Manager</label><input name="pcbu2SiteManager" defaultValue={v.pcbu2SiteManager} /></div>
          <div className="full"><label>PCBU 2 Health &amp; Safety Representative</label><input name="pcbu2HsRep" defaultValue={v.pcbu2HsRep} /></div>
        </div>
        <div className="label" style={{ marginTop: 16 }}>Declaration &amp; approval to start</div>
        <div className="hint">Record who signed and when (from the signed copy). Leave blank until it has actually been signed.</div>
        <div className="form" style={{ marginTop: 10 }}>
          <div><label>PCBU 1 signed by</label><input name="pcbu1SignedBy" defaultValue={sssp?.pcbu1SignedBy ?? ""} /></div>
          <div><label>Date</label><input type="date" name="pcbu1SignedAt" defaultValue={iso(sssp?.pcbu1SignedAt)} /></div>
          <div><label>PCBU 2 (Ali-Frame) signed by</label><input name="pcbu2SignedBy" defaultValue={sssp?.pcbu2SignedBy ?? ""} /></div>
          <div><label>Date</label><input type="date" name="pcbu2SignedAt" defaultValue={iso(sssp?.pcbu2SignedAt)} /></div>
          <div><label>Approval to start work — signed by (PCBU 1 representative)</label><input name="approvedToStartBy" defaultValue={sssp?.approvedToStartBy ?? ""} /></div>
          <div><label>Date</label><input type="date" name="approvedToStartAt" defaultValue={iso(sssp?.approvedToStartAt)} /></div>
          <div className="full"><label>Site-specific notes / hazards</label><textarea name="siteNotes" rows={3} defaultValue={sssp?.siteNotes ?? ""} /></div>
        </div>
        <div className="actions" style={{ marginTop: 12 }}><button className="btn primary" type="submit">Save SSSP</button></div>
      </form>
)}

      {sssp && (
        <form action={addSsspSignOn} className="card no-print" style={{ marginTop: 16 }}>
          <input type="hidden" name="ssspId" value={sssp.id} />
          <div className="label">Worker sign-on &amp; site acknowledgement</div>
          <div className="hint">Each worker confirms they have read this SSSP, received a site induction and agree to comply with it and the Main Contractor&apos;s site rules.</div>
          <div className="form" style={{ marginTop: 10 }}>
            <div><label>Name</label><input name="name" required /></div>
            <div><label>Company / Employer</label><input name="company" defaultValue="Ali-Frame Windows & Doors" /></div>
            <div><label>Site induction completed</label><input type="date" name="inductionDate" defaultValue={iso(new Date())} /></div>
          </div>
          <div className="actions" style={{ marginTop: 12 }}><button className="btn primary" type="submit">Add worker</button></div>
        </form>
      )}

      {/* ---------- Printable pack (mirrors the Word SSSP template) ---------- */}
      <section className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Site Specific Safety Plan</h2>
        <div>Site: <strong>{v.siteAddress || "________________"}</strong></div>
        <div>Job: {job.number} · Date: {fmt(sssp?.updatedAt ?? new Date())}</div>
        <div className="hint" style={{ marginTop: 8 }}>0800 254 372 · sales@aliframe.co.nz · www.aliframe.co.nz</div>
      </section>

      {section("policy")}

      <section className="card pagebreak" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Site Specific Health and Safety Agreement</h3>
        <table>
          <tbody>
            <tr><th style={{ width: 240 }}>The site this agreement relates to</th><td>{v.siteAddress || "—"}</td></tr>
            <tr><th>Site activities this agreement covers</th><td style={{ whiteSpace: "pre-wrap" }}>{v.siteActivities}</td></tr>
            <tr><th>Main Contractor (PCBU 1)</th><td>{sssp?.mainContractor || "—"}<br />Project Manager: {sssp?.pcbu1ProjectManager || "________"}<br />Site Manager: {sssp?.pcbu1SiteManager || "________"}<br />H&amp;S Representative: {sssp?.pcbu1HsRep || "________"}</td></tr>
            <tr><th>PCBU 2</th><td>Ali Frame Windows &amp; Doors<br />Project Manager: {v.pcbu2ProjectManager}<br />Site Manager: {v.pcbu2SiteManager}<br />H&amp;S Representative: {v.pcbu2HsRep}<br />Type of business: Contractor</td></tr>
            {sssp?.siteNotes && <tr><th>Site-specific notes</th><td style={{ whiteSpace: "pre-wrap" }}>{sssp.siteNotes}</td></tr>}
          </tbody>
        </table>
      </section>

      {section("incident-procedure")}

      <section className="card pagebreak" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Declaration</h3>
        <h4>PCBU 1 (Principal/Main Contractor)</h4>
        <p>We have read the site-specific safety plan information provided by Ali-Frame Windows &amp; Doors and agree that it is the appropriate approach to health and safety on this site for the duration of the contract.</p>
        <p>Signed: {sssp?.pcbu1SignedBy || "______________________"} &nbsp; Date: {fmt(sssp?.pcbu1SignedAt) || "__________"}</p>
        <h4>PCBU 2 (Ali Frame)</h4>
        <p>We agree to act according to the content of the site-specific safety plan as outlined above.</p>
        <p>Signed: {sssp?.pcbu2SignedBy || "______________________"} &nbsp; Date: {fmt(sssp?.pcbu2SignedAt) || "__________"}</p>
        <h4>Approval to start work</h4>
        <p>To be signed by a representative of PCBU 1 when all required pre-start documentation has been provided and approved.</p>
        <p>Signed: {sssp?.approvedToStartBy || "______________________"} &nbsp; Date: {fmt(sssp?.approvedToStartAt) || "__________"}</p>
      </section>

      <section className="card pagebreak" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Worker Sign-On &amp; Site Acknowledgement</h3>
        <p>Before starting work on this site, each worker must confirm that they have read and understood this Site Specific Safety Plan, received a site induction, and agree to comply with its requirements and with all Main Contractor site rules. This register is completed by each worker prior to starting work and is retained on site for the duration of the project.</p>
        <table>
          <thead><tr><th>Name</th><th>Company / Employer</th><th>Site induction completed</th><th>Signature</th><th>Date</th></tr></thead>
          <tbody>
            {sssp?.signOns.map((s) => (
              <tr key={s.id}><td>{s.name}</td><td>{s.company ?? ""}</td><td>{fmt(s.inductionDate)}</td><td>Acknowledged in app</td><td>{fmt(s.createdAt)}</td></tr>
            ))}
            {Array.from({ length: Math.max(0, 12 - (sssp?.signOns.length ?? 0)) }).map((_, i) => (
              <tr key={`b${i}`}><td style={{ height: 30 }}>&nbsp;</td><td></td><td></td><td></td><td></td></tr>
            ))}
          </tbody>
        </table>
      </section>

      {section("hazard-risk-procedure")}

      <section className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Company Hazard and Risk Register</h3>
        <table>
          <thead><tr><th>Task/Activity</th><th>Hazard</th><th>Potential Harm</th><th>Initial Risk</th><th>Control Measures</th><th>Residual Risk</th></tr></thead>
          <tbody>
            {risks.map((r) => (
              <tr key={r.id}>
                <td>{r.activity}</td><td>{r.hazard}</td><td>{r.potentialHarm ?? ""}</td>
                <td><span className={`status ${RISK_COLOR[r.initialRisk] ?? "grey"}`}>{r.initialRisk}</span></td>
                <td>{r.controls}</td>
                <td><span className={`status ${RISK_COLOR[r.residualRisk] ?? "grey"}`}>{r.residualRisk}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {section("ppe")}
      {section("hazardous-substances")}
      {section("emergency-response")}

      <section className="card pagebreak" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Training &amp; Qualifications Register</h3>
        <p>Ali-Frame maintains a register of worker competencies, licences and trade qualifications relevant to the scope of work carried out on client sites.</p>
        <table>
          <thead><tr><th>Name</th><th>Key Role</th><th>Training, licences &amp; Formal Qualifications</th><th>Years Experience</th></tr></thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td><td>{p.keyRole ?? ""}</td>
                <td>{[p.siteSafeNumber ? `No. ${p.siteSafeNumber}` : "", p.qualifications ?? ""].filter(Boolean).join(" — ")}</td>
                <td>{p.yearsExperience ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="hint" style={{ marginTop: 12 }}>© 2026 BLB Consultants Limited T/A Ali-Frame Windows &amp; Doors — Confidential</div>
      </section>
    </div>
  );
}
