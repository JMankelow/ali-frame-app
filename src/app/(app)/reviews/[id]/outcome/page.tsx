// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "../../../health-safety/PrintButton";
import { AckForm } from "./AckForm";
import { getReviewTemplate, scoreRatings, fmt1, type Ratings, type OutcomeData } from "@/lib/reviewTemplates";

const long = (d: Date | null | undefined) => (d ? d.toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" }) : "—");
const BLUE = "#0057b8";
const TINT = "#eaf4fb";
const LINE = "#b8d7ea";

const css = `
.out{font-family:Calibri,Arial,sans-serif;color:#111827;max-width:900px;margin:0 auto;background:#fff;padding:28px 34px}
.out h1{color:${BLUE};font-size:30px;margin:8px 0 0;font-weight:800;letter-spacing:.5px}
.out h2{color:${BLUE};font-size:20px;margin:26px 0 8px;font-weight:800}
.out h3{color:${BLUE};font-size:15px;margin:16px 0 6px;font-weight:800}
.out table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:4px}
.out th{background:${TINT};color:${BLUE};text-align:left;padding:6px 8px;border:1px solid ${LINE}}
.out td{border:1px solid ${LINE};padding:6px 8px;vertical-align:top}
.out td.k{background:${TINT};color:${BLUE};font-weight:700;width:30%}
.out .ok{background:#dcfce7}.out .amber{background:#fef3c7}.out .red{background:#fee2e2}
.out .sub{font-style:italic;color:${BLUE};border-bottom:1px solid ${BLUE};padding-bottom:6px;margin-bottom:12px}
.out .sumtxt{font-size:12.5px;font-style:italic;margin:4px 0 12px}
.out .rule{font-style:italic;font-size:12px;margin-top:6px}
.out ul{margin:4px 0 8px;padding-left:20px;font-size:14px}
@media print{.noprint{display:none!important}.out{padding:0}.out tr{break-inside:avoid}}
`;

export default async function OutcomePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const review = await prisma.review360.findUnique({ where: { id }, include: { responses: true, employee: true, assessor: true } });
  if (!review) notFound();
  const isEmployee = user.id === review.employeeId;
  const isAssessor = user.id === review.assessorId;
  if (!isEmployee && !isAssessor && !user.isSuperUser) notFound();
  // The person assessed only ever sees the finished outcome.
  if (review.status !== "Completed") notFound();
  const tpl = getReviewTemplate(review.templateKey);
  if (!tpl) notFound();

  const selfResp = review.responses.find((r) => r.role === "self");
  const mgrResp = review.responses.find((r) => r.role === "manager");
  const selfR = (selfResp?.ratings as Ratings) ?? {};
  const mgrR = (mgrResp?.ratings as Ratings) ?? {};
  const selfS = scoreRatings(tpl, selfR);
  const mgrS = scoreRatings(tpl, mgrR);
  const o = (review.outcome as OutcomeData) ?? {};
  const mgrNotes = (mgrResp?.sectionNotes as Record<string, string>) ?? {};
  const name = review.employee.name;
  const first = name.split(" ")[0];
  const diff = (a: number | null, b: number | null, d = 2) => (a == null || b == null ? "—" : `${b - a >= 0 ? "+" : ""}${(b - a).toFixed(d)}`);

  const best = [...mgrS.sections].filter((s) => s.average != null).sort((a, b) => (b.average ?? 0) - (a.average ?? 0)).slice(0, 3);
  const weakest = [...mgrS.sections].filter((s) => s.average != null).sort((a, b) => (a.average ?? 0) - (b.average ?? 0)).slice(0, 3);
  const lowItems = tpl.sections.flatMap((s) => s.items.filter((i) => mgrR[i.key]?.r != null && (mgrR[i.key].r as number) < 3).map((i) => `${i.competency} (${mgrR[i.key].r})`));
  const cell = (r: number | null | undefined) => (r == null ? "" : r >= 3 ? "ok" : r === 2 ? "amber" : "red");

  return (
    <div>
      <div className="topbar no-print">
        <div>
          <h2>Outcome &amp; development plan — {name}</h2>
          <div className="subtitle">{review.period}</div>
        </div>
        <div className="actions">
          <PrintButton />
          <Link href={`/reviews/${review.id}`} className="btn light">← Overview</Link>
        </div>
      </div>

      <div className="out">
        <style>{css}</style>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/aliframe-logo.png" alt="Ali-Frame Windows & Doors" style={{ height: 54 }} />
        <h1>360 REVIEW OUTCOME</h1>
        <div style={{ fontSize: 18, color: BLUE, fontWeight: 700 }}>&amp; Development Plan</div>
        <div style={{ fontStyle: "italic", margin: "4px 0" }}>Assessment date: {long(review.assessmentDate ?? review.completedAt)}</div>
        <div className="sub">{tpl.name} Competency Assessment (360 Review) — Scoring, Calculations and Goals · Employee pack: {name}</div>

        <h3>Assessment Summary</h3>
        <table>
          <tbody>
            <tr><td className="k">Employee</td><td>{name}</td></tr>
            <tr><td className="k">Current level</td><td>{o.currentLevel || review.currentLevel || "—"}</td></tr>
            <tr><td className="k">Manager / assessor</td><td>{review.assessor?.name ?? "—"}</td></tr>
            <tr><td className="k">Assessment date</td><td>{long(review.assessmentDate)}</td></tr>
            <tr><td className="k">Hours / work pattern</td><td>{review.hoursPattern || "—"}</td></tr>
            <tr><td className="k">360 contributors</td><td>Self | Manager</td></tr>
            <tr><td className="k">Next review</td><td>{long(review.nextReviewDate)}</td></tr>
          </tbody>
        </table>

        <h2>1. At a glance</h2>
        <table>
          <thead><tr><th>Measure</th><th>Self</th><th>Manager</th><th>Difference</th></tr></thead>
          <tbody>
            <tr><td>Competencies rated</td><td>{selfS.rated} of {tpl.sections.reduce((n, s) => n + s.items.length, 0)}</td><td>{mgrS.rated} of {tpl.sections.reduce((n, s) => n + s.items.length, 0)}</td><td>—</td></tr>
            <tr><td>Total score</td><td>{selfS.total} / {selfS.rated * 5}</td><td>{mgrS.total} / {mgrS.rated * 5}</td><td>{mgrS.total - selfS.total >= 0 ? "+" : ""}{mgrS.total - selfS.total}</td></tr>
            <tr><td>Overall average (total ÷ items rated)</td><td>{fmt1(selfS.average)}</td><td>{fmt1(mgrS.average)}</td><td>{diff(selfS.average, mgrS.average)}</td></tr>
            <tr><td>Percentage of maximum</td><td>{fmt1(selfS.percent, 1)}%</td><td>{fmt1(mgrS.percent, 1)}%</td><td>{selfS.percent != null && mgrS.percent != null ? `${(mgrS.percent - selfS.percent >= 0 ? "+" : "")}${(mgrS.percent - selfS.percent).toFixed(1)} pts` : "—"}</td></tr>
            <tr><td>Competencies rated 3+ (competent)</td><td>{selfS.atLeastThree} of {selfS.rated}</td><td>{mgrS.atLeastThree} of {mgrS.rated}</td><td>—</td></tr>
          </tbody>
        </table>

        <h3>Where {first} is</h3>
        <p style={{ fontSize: 14, lineHeight: 1.5 }}>
          The manager&apos;s overall average of {fmt1(mgrS.average)} places {first} {mgrS.average != null && mgrS.average >= 3 ? "at or above" : "just below"} &ldquo;Competent&rdquo; (3.0) across the full framework.
          {o.recommendedLevel ? ` Recommended level: ${o.recommendedLevel}.` : ""} {o.notes ? o.notes : ""}
        </p>
        {(o.strengths || best.length > 0) && (
          <>
            <h3>Key strengths</h3>
            <ul>
              {o.strengths ? o.strengths.split("\n").filter(Boolean).map((l, i) => <li key={i}>{l}</li>) : best.map((s) => <li key={s.key}>{s.title} — manager average {fmt1(s.average)}</li>)}
            </ul>
          </>
        )}
        {(o.priorities || weakest.length > 0) && (
          <>
            <h3>Priority development areas</h3>
            <ul>
              {o.priorities ? o.priorities.split("\n").filter(Boolean).map((l, i) => <li key={i}>{l}</li>) : weakest.map((s) => <li key={s.key}>{s.title} — manager average {fmt1(s.average)}</li>)}
              {lowItems.length > 0 && <li>Rated below 3: {lowItems.join("; ")}</li>}
            </ul>
          </>
        )}

        <h2>2. How the scores were calculated</h2>
        <p style={{ fontSize: 13 }}>Rating scale: 1 Not yet competent · 2 Developing · 3 Competent · 4 Advanced · 5 Expert / leader · N/O Not observed. Items rated N/O or left blank are excluded from totals and averages.</p>
        <table>
          <tbody>
            <tr><td className="k">Section total</td><td>Sum of the ratings for every rated competency in the section</td></tr>
            <tr><td className="k">Section average</td><td>Section total ÷ number of rated competencies in the section</td></tr>
            <tr><td className="k">Section % of maximum</td><td>Section total ÷ (number of rated competencies × 5)</td></tr>
            <tr><td className="k">Overall total</td><td>Sum of all section totals</td></tr>
            <tr><td className="k">Overall average</td><td>Overall total ÷ number of rated competencies</td></tr>
            <tr><td className="k">Variance</td><td>Manager rating − Self rating (positive = manager rated higher)</td></tr>
            <tr><td className="k">Standard met</td><td>Manager rating of 3 (Competent) or above</td></tr>
          </tbody>
        </table>

        <h3>Section summary</h3>
        <table>
          <thead><tr><th>Section</th><th>Items rated (S/M)</th><th>Self total</th><th>Self avg</th><th>Mgr total</th><th>Mgr avg</th><th>Mgr % of max</th></tr></thead>
          <tbody>
            {tpl.sections.map((s, n) => (
              <tr key={s.key}>
                <td>{n + 1}. {s.title}</td>
                <td>{selfS.sections[n].rated}/{mgrS.sections[n].rated}</td>
                <td>{selfS.sections[n].total}/{selfS.sections[n].rated * 5}</td><td>{fmt1(selfS.sections[n].average)}</td>
                <td>{mgrS.sections[n].total}/{mgrS.sections[n].rated * 5}</td><td className={mgrS.sections[n].average != null && mgrS.sections[n].average! >= 3 ? "ok" : "amber"}>{fmt1(mgrS.sections[n].average)}</td>
                <td>{mgrS.sections[n].percent != null ? `${Math.round(mgrS.sections[n].percent!)}%` : "—"}</td>
              </tr>
            ))}
            <tr><td><b>Overall</b></td><td>{selfS.rated}/{mgrS.rated}</td><td>{selfS.total}/{selfS.rated * 5}</td><td>{fmt1(selfS.average)}</td><td>{mgrS.total}/{mgrS.rated * 5}</td><td><b>{fmt1(mgrS.average)}</b></td><td>{mgrS.percent != null ? `${mgrS.percent.toFixed(1)}%` : "—"}</td></tr>
          </tbody>
        </table>
        <div className="rule">Green = section average at or above Competent (3.0); amber = below 3.0. N/O = not observed.</div>

        <h2>3. Detailed competency scoring</h2>
        <p style={{ fontSize: 13 }}>Ratings are shaded by the manager score: green = 3+ (meets standard), amber = 2 (developing), red = 1 (not yet competent).</p>
        {tpl.sections.map((s, n) => (
          <div key={s.key}>
            <h3>{n + 1}. {s.title}</h3>
            <table>
              <thead><tr><th>Competency</th><th style={{ width: 70 }}>Self (1–5)</th><th style={{ width: 80 }}>Manager (1–5)</th><th style={{ width: 70 }}>Variance</th><th style={{ width: 110 }}>Standard met?</th></tr></thead>
              <tbody>
                {s.items.map((i) => {
                  const sv = selfR[i.key]; const mv = mgrR[i.key];
                  const sn = sv?.r ?? null; const mn = mv?.r ?? null;
                  return (
                    <tr key={i.key}>
                      <td>{i.competency}{mv?.c ? <div style={{ fontSize: 12, color: "#475569" }}>{mv.c}</div> : null}</td>
                      <td>{sv?.na ? "N/O" : sn ?? "—"}</td>
                      <td className={cell(mn)}>{mv?.na ? "N/O" : mn ?? "—"}</td>
                      <td>{sn != null && mn != null ? `${mn - sn >= 0 ? "+" : ""}${mn - sn}` : "—"}</td>
                      <td>{mn == null ? "—" : mn >= 3 ? "Yes" : "No – gap"}</td>
                    </tr>
                  );
                })}
                <tr><td><b>Total</b></td><td>{selfS.sections[n].total} / {selfS.sections[n].rated * 5}</td><td>{mgrS.sections[n].total} / {mgrS.sections[n].rated * 5}</td><td>{mgrS.sections[n].total - selfS.sections[n].total >= 0 ? "+" : ""}{mgrS.sections[n].total - selfS.sections[n].total}</td><td></td></tr>
                <tr><td>Average (total ÷ items rated)</td><td>{fmt1(selfS.sections[n].average)}</td><td>{fmt1(mgrS.sections[n].average)}</td><td></td><td></td></tr>
              </tbody>
            </table>
            {mgrNotes[s.key] && <div className="sumtxt">Section summary / development need: {mgrNotes[s.key]}</div>}
          </div>
        ))}

        <h2>4. Assessment outcome</h2>
        <table>
          <tbody>
            <tr><td className="k">Overall score</td><td>Manager {mgrS.total} / {mgrS.rated * 5} ({fmt1(mgrS.average)} average, {fmt1(mgrS.percent, 1)}%) | Self {selfS.total} / {selfS.rated * 5} ({fmt1(selfS.average)} average)</td></tr>
            <tr><td className="k">Current demonstrated level</td><td>{o.currentLevel || "—"}</td></tr>
            <tr><td className="k">Recommended level</td><td>{o.recommendedLevel || "—"}</td></tr>
            <tr><td className="k">Recommended pay band</td><td>{o.payBand || "—"}</td></tr>
            <tr><td className="k">Placement within band</td><td>{o.placement || "—"}</td></tr>
            <tr><td className="k">Essential competency gaps</td><td>{o.gaps || "—"}</td></tr>
            <tr><td className="k">Additional evidence required</td><td>{o.evidenceNeeded || "—"}</td></tr>
            <tr><td className="k">Authority or scope clarification</td><td>{o.scope || "—"}</td></tr>
            <tr><td className="k">Progression decision</td><td>{o.decision || "—"}</td></tr>
            <tr><td className="k">Next review date</td><td>{o.nextReview ? long(new Date(o.nextReview)) : long(review.nextReviewDate)}</td></tr>
            <tr><td className="k">Indicative timeframe for recommended level</td><td>{o.timeframe || "—"}</td></tr>
          </tbody>
        </table>
        <div className="rule">The timeframes are a guide to the minimum expected experience only. Pay and progression are not automatic based on time served or an average score. Any remuneration change remains subject to business need, formal approval, the employee employment agreement and an agreed written variation.</div>

        {o.benefits && Object.values(o.benefits).some(Boolean) && (
          <>
            <h3>Other benefits</h3>
            <table>
              <thead><tr><th>Benefit</th><th>Allocated</th></tr></thead>
              <tbody>{tpl.benefits.map((b) => <tr key={b.name}><td>{b.name}</td><td>{o.benefits?.[b.name] || "—"}</td></tr>)}</tbody>
            </table>
          </>
        )}

        <h2>5. Development and accountability plan</h2>
        <table>
          <thead><tr><th>Priority / competency</th><th>Required action and support</th><th>Owner</th><th>Target date</th><th>Evidence of completion</th></tr></thead>
          <tbody>
            {(o.plan ?? []).filter((p) => p.priority || p.action).map((p, i) => (
              <tr key={i}><td>{p.priority}</td><td>{p.action}</td><td>{p.owner}</td><td>{p.target}</td><td>{p.evidence}</td></tr>
            ))}
            {!(o.plan ?? []).some((p) => p.priority || p.action) && <tr><td colSpan={5}>No plan items recorded.</td></tr>}
          </tbody>
        </table>

        <h2>Employee comments</h2>
        <div style={{ border: `1px solid ${LINE}`, padding: 10, minHeight: 50, whiteSpace: "pre-wrap" }}>{review.employeeComments || "—"}</div>

        <h3>Acknowledgement</h3>
        <p style={{ fontStyle: "italic", fontSize: 12.5 }}>Signatures acknowledge that the assessment discussion occurred and the outcome and actions were recorded. They do not necessarily indicate agreement with every rating or comment.</p>
        <table>
          <thead><tr><th>Employee</th><th>Manager / assessor</th></tr></thead>
          <tbody>
            <tr><td>{name}{review.employeeAckAt ? ` — acknowledged ${long(review.employeeAckAt)}` : ""}</td><td>{review.assessor?.name}{review.managerAckAt ? ` — completed ${long(review.managerAckAt)}` : ""}</td></tr>
            <tr><td>Date: {review.employeeAckAt ? long(review.employeeAckAt) : "____________________"}</td><td>Date: {review.managerAckAt ? long(review.managerAckAt) : "____________________"}</td></tr>
          </tbody>
        </table>
        {isEmployee && !review.employeeAckAt && <AckForm reviewId={review.id} name={name} defaultComments={review.employeeComments ?? ""} />}

        <h2>Appendix — Level and pay-band framework</h2>
        <table>
          <thead><tr><th>Classification</th><th>Level</th><th>Pay band (per hour)</th><th>Required progression focus</th><th>Indicative timeframe</th></tr></thead>
          <tbody>{tpl.framework.map((f) => <tr key={f.classification + f.level}><td>{f.classification}</td><td>{f.level}</td><td>{f.payBand}</td><td>{f.focus}</td><td>{f.timeframe}</td></tr>)}</tbody>
        </table>
        <div className="rule" style={{ marginTop: 18 }}>© BLB Consultants Limited T/A Ali-Frame Windows &amp; Doors — Confidential</div>
      </div>
    </div>
  );
}
