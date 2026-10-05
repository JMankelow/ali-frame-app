// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useActionState, useMemo, useState } from "react";
import { saveAssessment, type ReviewFormState } from "../../actions";
import {
  ASSESSMENT_RULE,
  PURPOSE_TEXT,
  RATING_SCALE,
  FEEDBACK_QUESTIONS,
  QUALIFICATION_ROWS,
  FEEDBACK_SOURCES,
  DECISION_OPTIONS,
  scoreRatings,
  recommendLevel,
  recommendPayBand,
  fmt1,
  type ReviewTemplateDef,
  type Ratings,
  type OutcomeData,
} from "@/lib/reviewTemplates";

export interface SheetHeader {
  employeeName: string;
  currentLevel: string;
  assessorName: string;
  levelSought: string;
  period: string;
  assessmentDate: string;
  workLocation: string;
  hoursPattern: string;
  contributors: string;
  nextReview: string;
}
export interface SheetData {
  ratings: Ratings; // this sheet's own ratings
  selfRatings: Ratings; // shown read-only on the manager sheet (only once the self assessment is submitted)
  sectionNotes: Record<string, string>;
  feedback: Record<string, unknown>;
  evidence: { job: string; work: string; period: string; outcome: string; comments: string }[];
  feedback360: Record<string, { strengths: string; development: string }>;
  quals: Record<string, { evidence: string; status: string; action: string }>;
  qualPrefill: Record<string, string>;
  outcome: OutcomeData;
  employeeComments: string;
  selfSubmitted: boolean;
}

const BLUE = "#0057b8";
const TINT = "#eaf4fb";
const LINE = "#b8d7ea";

const css = `
.asm{font-family:Calibri,Arial,sans-serif;color:#111827;max-width:900px;margin:0 auto;background:#fff;padding:28px 34px}
.asm h1{color:${BLUE};font-size:28px;margin:10px 0 4px;font-weight:800}
.asm h2{color:${BLUE};font-size:20px;margin:26px 0 8px;font-weight:800}
.asm h3{color:${BLUE};font-size:15px;margin:18px 0 6px;font-weight:800}
.asm .sub{color:${BLUE};font-style:italic;border-bottom:1px solid ${BLUE};padding-bottom:8px;margin-bottom:14px}
.asm table{width:100%;border-collapse:collapse;font-size:13px}
.asm th{background:${TINT};color:${BLUE};text-align:left;padding:7px 8px;border:1px solid ${LINE};font-weight:700;vertical-align:top}
.asm td{border:1px solid ${LINE};padding:7px 8px;vertical-align:top}
.asm td.k{background:${TINT};color:${BLUE};font-weight:700;width:30%}
.asm input,.asm select,.asm textarea{font:inherit;font-size:13px;width:100%;border:1px solid #cbd5e1;border-radius:3px;padding:4px 6px;background:#fff}
.asm td input,.asm td textarea,.asm td select{border-color:#e2e8f0}
.asm textarea{resize:vertical}
.asm .ro{white-space:pre-wrap}
.asm .summary{font-style:italic;font-size:12.5px;margin:4px 0 0;display:flex;gap:18px;align-items:center;flex-wrap:wrap}
.asm .summary input{width:auto;flex:1;min-width:200px;font-style:normal}
.asm .rule{font-style:italic;font-size:12px;margin-top:6px}
.asm .actions{display:flex;gap:10px;flex-wrap:wrap;margin:22px 0 4px}
.asm .foot{border-top:1px solid ${LINE};color:${BLUE};font-size:11px;margin-top:28px;padding-top:6px;display:flex;justify-content:space-between}
.asm .note{background:#fff8e1;border:1px solid #f1d98a;padding:8px 10px;font-size:13px;margin:10px 0}
.asm .num{text-align:center;width:90px}
@media print{.asm{padding:0;max-width:none}.asm .actions,.asm .noprint{display:none!important}.asm h2{break-after:avoid}.asm table{break-inside:auto}.asm tr{break-inside:avoid}}
`;

export function AssessmentSheet({
  reviewId,
  role,
  template,
  header,
  data,
  readOnly,
  logoSrc,
}: {
  reviewId: string;
  role: "self" | "manager";
  template: ReviewTemplateDef;
  header: SheetHeader;
  data: SheetData;
  readOnly: boolean;
  logoSrc: string;
}) {
  const [state, formAction, pending] = useActionState(saveAssessment.bind(null, reviewId, role), {} as ReviewFormState);
  const [ratings, setRatings] = useState<Ratings>(data.ratings);
  const isManager = role === "manager";

  const score = useMemo(() => scoreRatings(template, ratings), [template, ratings]);
  const selfScore = useMemo(() => scoreRatings(template, data.selfRatings), [template, data.selfRatings]);
  const suggestedLevel = recommendLevel(template, score.average);
  const suggestedPay = recommendPayBand(template, score.average);

  const setRating = (key: string, value: string) =>
    setRatings((cur) => ({ ...cur, [key]: { ...cur[key], r: /^[1-5]$/.test(value) ? Number(value) : null, na: value === "NO", c: cur[key]?.c } }));
  const ratingValue = (key: string) => (ratings[key]?.na ? "NO" : ratings[key]?.r != null ? String(ratings[key].r) : "");
  const roShow = (key: string, src: Ratings) => (src[key]?.na ? "N/O" : src[key]?.r != null ? String(src[key].r) : "—");
  const o = data.outcome;
  const title = isManager ? `${template.title} — Manager assessment` : `${template.title} — Self assessment`;

  const field = (name: string, value: string | undefined, props: { type?: string; ph?: string; rows?: number } = {}) =>
    readOnly ? <div className="ro">{value || "—"}</div> : props.rows ? <textarea name={name} defaultValue={value ?? ""} rows={props.rows} placeholder={props.ph} /> : <input type={props.type ?? "text"} name={name} defaultValue={value ?? ""} placeholder={props.ph} />;

  return (
    <form action={formAction} className="asm">
      <style>{css}</style>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoSrc} alt="Ali-Frame Windows & Doors" style={{ height: 54 }} />
      <h1>{title}</h1>
      <div className="sub">{template.subtitle}</div>

      <table>
        <tbody>
          <tr><td className="k">Employee</td><td>{header.employeeName}</td></tr>
          <tr><td className="k">Current level</td><td>{header.currentLevel || "—"}</td></tr>
          <tr><td className="k">Manager / assessor</td><td>{header.assessorName}</td></tr>
          <tr><td className="k">Level sought</td><td>{header.levelSought || "—"}</td></tr>
          <tr><td className="k">Review period</td><td>{header.period}</td></tr>
          <tr><td className="k">Assessment date</td><td>{header.assessmentDate || "—"}</td></tr>
          <tr><td className="k">Primary work location</td><td>{header.workLocation || "—"}</td></tr>
          <tr><td className="k">Hours / work pattern</td><td>{header.hoursPattern || "—"}</td></tr>
          <tr><td className="k">360 contributors</td><td>{header.contributors}</td></tr>
          <tr><td className="k">Next review</td><td>{header.nextReview || "—"}</td></tr>
        </tbody>
      </table>

      <h2>Purpose and use</h2>
      <p style={{ fontSize: 14, lineHeight: 1.5 }}>{PURPOSE_TEXT}</p>

      <h3>Rating scale</h3>
      <table>
        <thead><tr>{RATING_SCALE.map((r) => <th key={r.value}>{r.name}</th>)}</tr></thead>
        <tbody><tr>{RATING_SCALE.map((r) => <td key={r.value}>{r.text}</td>)}</tr></tbody>
      </table>
      <div className="rule">{ASSESSMENT_RULE}</div>

      {isManager ? (
        <>
          <h2>Evidence to review</h2>
          <table>
            <thead><tr><th>Job / file</th><th>Work reviewed</th><th>Period / date</th><th>Outcome / defects</th><th>Reviewer comments</th></tr></thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => {
                const e = data.evidence[i - 1] ?? { job: "", work: "", period: "", outcome: "", comments: "" };
                return (
                  <tr key={i}>
                    <td>{field(`ev${i}_job`, e.job)}</td><td>{field(`ev${i}_work`, e.work)}</td><td>{field(`ev${i}_period`, e.period)}</td><td>{field(`ev${i}_outcome`, e.outcome)}</td><td>{field(`ev${i}_comments`, e.comments)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      ) : (
        <>
          <h2>Your last 5 top jobs</h2>
          <table>
            <thead><tr><th>Job</th><th>Outcome</th><th style={{ width: 90 }}>Rating (1–5)</th><th>Comments / evidence</th></tr></thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => {
                const j = ((data.feedback.topJobs as { job: string; outcome: string; rating: string; comments: string }[] | undefined) ?? [])[i - 1] ?? { job: "", outcome: "", rating: "", comments: "" };
                return (
                  <tr key={i}>
                    <td>{field(`tj${i}_job`, j.job)}</td><td>{field(`tj${i}_outcome`, j.outcome)}</td>
                    <td>{readOnly ? j.rating || "—" : <input name={`tj${i}_rating`} defaultValue={j.rating} inputMode="numeric" maxLength={1} />}</td>
                    <td>{field(`tj${i}_comments`, j.comments)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {template.sections.map((s, n) => {
        const sc = score.sections[n];
        const ssc = selfScore.sections[n];
        return (
          <section key={s.key}>
            <h2>{n + 1}. {s.title}</h2>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "20%" }}>Competency</th>
                  <th>Expectation</th>
                  <th className="num">Self (1–5)</th>
                  {isManager && <th className="num">Manager (1–5)</th>}
                  <th style={{ width: "22%" }}>Comments / evidence</th>
                </tr>
              </thead>
              <tbody>
                {s.items.map((item) => (
                  <tr key={item.key}>
                    <td>{item.competency}</td>
                    <td>{item.expectation}</td>
                    <td className="num">
                      {isManager ? (data.selfSubmitted ? roShow(item.key, data.selfRatings) : <span title="Self assessment not submitted yet">—</span>) : readOnly ? roShow(item.key, ratings) : (
                        <select name={`r_${item.key}`} value={ratingValue(item.key)} onChange={(e) => setRating(item.key, e.target.value)}>
                          <option value="">–</option>
                          {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
                          <option value="NO">N/O</option>
                        </select>
                      )}
                    </td>
                    {isManager && (
                      <td className="num">
                        {readOnly ? roShow(item.key, ratings) : (
                          <select name={`r_${item.key}`} value={ratingValue(item.key)} onChange={(e) => setRating(item.key, e.target.value)}>
                            <option value="">–</option>
                            {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
                            <option value="NO">N/O</option>
                          </select>
                        )}
                      </td>
                    )}
                    <td>{field(`c_${item.key}`, ratings[item.key]?.c, { rows: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="summary">
              <span>Section summary / development need:</span>
              {readOnly ? <span style={{ fontStyle: "normal" }}>{data.sectionNotes[s.key] || ""}</span> : <input name={`sn_${s.key}`} defaultValue={data.sectionNotes[s.key] ?? ""} />}
              <span>Total: <b>{sc.total}</b></span>
              <span>Average: <b>{fmt1(sc.average)}</b></span>
              {isManager && data.selfSubmitted && <span>Self average: <b>{fmt1(ssc.average)}</b></span>}
            </div>
          </section>
        );
      })}

      {!isManager && (
        <>
          <h2>Development &amp; Feedback</h2>
          <p style={{ fontSize: 13 }}>Use the box to record practical examples, ideas and what you would like to develop.</p>
          {FEEDBACK_QUESTIONS.map((g) => (
            <div key={g.group}>
              <h3>{g.group}</h3>
              <table>
                <tbody>
                  {g.qs.map((q) => (
                    <tr key={q.key}>
                      <td className="k" style={{ width: "40%" }}>{q.q}</td>
                      <td>{field(q.key, data.feedback[q.key] as string | undefined, { rows: 3 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}

      {isManager && (
        <>
          <h2>Qualifications, Certifications and Scope</h2>
          <table>
            <thead><tr><th>Requirement</th><th>Current evidence</th><th>Status</th><th>Action required</th></tr></thead>
            <tbody>
              {QUALIFICATION_ROWS.map((q) => {
                const v = data.quals[q.key] ?? { evidence: "", status: "", action: "" };
                return (
                  <tr key={q.key}>
                    <td>{q.requirement}</td>
                    <td>{field(`ql_${q.key}_e`, v.evidence || data.qualPrefill[q.key] || "")}</td>
                    <td>{field(`ql_${q.key}_s`, v.status, { ph: q.statusHint })}</td>
                    <td>{field(`ql_${q.key}_a`, v.action)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <h2>360 Feedback Summary</h2>
          <table>
            <thead><tr><th>Feedback source</th><th>Strengths / positive examples</th><th>Development themes / examples</th></tr></thead>
            <tbody>
              {FEEDBACK_SOURCES.map((s) => (
                <tr key={s.key}>
                  <td>{s.label}</td>
                  <td>{field(`f360_${s.key}_s`, data.feedback360[s.key]?.strengths, { rows: 2 })}</td>
                  <td>{field(`f360_${s.key}_d`, data.feedback360[s.key]?.development, { rows: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>Level and Pay-Band Framework</h2>
          <table>
            <thead><tr><th>Classification</th><th>Level</th><th>Pay band (per hour)</th><th>Required progression focus</th><th>Indicative timeframe</th></tr></thead>
            <tbody>
              {template.framework.map((f) => (
                <tr key={f.classification + f.level}><td>{f.classification}</td><td>{f.level}</td><td>{f.payBand}</td><td>{f.focus}</td><td>{f.timeframe}</td></tr>
              ))}
            </tbody>
          </table>

          <h2>Assessment Outcome</h2>
          <div className="note noprint">
            Calculated from the manager ratings: total <b>{score.total}</b> across <b>{score.rated}</b> rated competencies — average <b>{fmt1(score.average)}</b> ({fmt1(score.percent, 1)}% of maximum)
            {data.selfSubmitted ? <> · self total {selfScore.total}, average {fmt1(selfScore.average)}</> : null}. Suggested level: <b>{suggestedLevel || "—"}</b>; suggested pay band: <b>{suggestedPay || "—"}</b>. These are a guide only.
          </div>
          <table>
            <tbody>
              <tr><td className="k">Current demonstrated level</td><td>{field("o_currentLevel", o.currentLevel ?? header.currentLevel, { ph: suggestedLevel })}</td></tr>
              <tr><td className="k">Recommended level</td><td>{field("o_recommendedLevel", o.recommendedLevel, { ph: suggestedLevel })}</td></tr>
              <tr><td className="k">Recommended pay band</td><td>{field("o_payBand", o.payBand, { ph: suggestedPay })}</td></tr>
              <tr><td className="k">Placement within band</td><td>{field("o_placement", o.placement, { ph: "Current: …   Recommended: …" })}</td></tr>
              <tr><td className="k">Essential competency gaps</td><td>{field("o_gaps", o.gaps, { rows: 2, ph: "None / Yes — details" })}</td></tr>
              <tr><td className="k">Additional evidence required</td><td>{field("o_evidenceNeeded", o.evidenceNeeded, { rows: 2, ph: "No / Yes — details" })}</td></tr>
              <tr><td className="k">Authority or scope clarification required</td><td>{field("o_scope", o.scope, { rows: 2, ph: "No / Yes — details" })}</td></tr>
              <tr>
                <td className="k">Progression decision</td>
                <td>{readOnly ? <div className="ro">{o.decision || "—"}</div> : (
                  <select name="o_decision" defaultValue={o.decision ?? ""}>
                    <option value="">—</option>
                    {DECISION_OPTIONS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                )}</td>
              </tr>
              <tr><td className="k">Next review date</td><td>{field("o_nextReview", o.nextReview, { type: "date" })}</td></tr>
              <tr><td className="k">Indicative timeframe for recommended level</td><td>{field("o_timeframe", o.timeframe)}</td></tr>
            </tbody>
          </table>
          <div className="rule">The timeframes are a guide to the minimum expected experience only. Employees may progress sooner where they consistently demonstrate the required competency, performance and independence. Pay and progression are not automatic based on time served or an average score. Any remuneration change remains subject to business need, formal approval, the employee employment agreement and an agreed written variation.</div>

          <h3>Manager&apos;s notes</h3>
          {field("o_notes", o.notes, { rows: 3 })}
          <table style={{ marginTop: 8 }}>
            <tbody>
              <tr><td className="k">Key strengths</td><td>{field("o_strengths", o.strengths, { rows: 3 })}</td></tr>
              <tr><td className="k">Priority development areas</td><td>{field("o_priorities", o.priorities, { rows: 3 })}</td></tr>
            </tbody>
          </table>

          <h3>Other benefits</h3>
          <table>
            <thead><tr><th>Benefit</th><th>Value per annum</th><th style={{ width: 100 }}>Allocated</th></tr></thead>
            <tbody>
              {template.benefits.map((b, i) => (
                <tr key={b.name}>
                  <td>{b.name}</td><td>{b.value}</td>
                  <td>{readOnly ? o.benefits?.[b.name] || "—" : (
                    <select name={`ben_${i}`} defaultValue={o.benefits?.[b.name] ?? ""}>
                      <option value="">—</option><option>Y</option><option>N</option>
                    </select>
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>Development and Accountability Plan</h2>
          <table>
            <thead><tr><th>Priority / competency</th><th>Required action and support</th><th>Owner</th><th>Target date</th><th>Evidence of completion</th></tr></thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6].map((i) => {
                const p = o.plan?.[i - 1] ?? { priority: "", action: "", owner: "", target: "", evidence: "" };
                return (
                  <tr key={i}>
                    <td>{field(`pl${i}_priority`, p.priority)}</td><td>{field(`pl${i}_action`, p.action, { rows: 2 })}</td><td>{field(`pl${i}_owner`, p.owner)}</td><td>{field(`pl${i}_target`, p.target)}</td><td>{field(`pl${i}_evidence`, p.evidence)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      <h2>Employee Comments</h2>
      {isManager ? <div className="ro" style={{ border: `1px solid ${LINE}`, padding: 8, minHeight: 50 }}>{data.employeeComments || "—"}</div> : field("employeeComments", data.employeeComments, { rows: 4 })}

      <h3>Acknowledgement</h3>
      <p style={{ fontStyle: "italic", fontSize: 12.5 }}>Signatures acknowledge that the assessment discussion occurred and the outcome and actions were recorded. They do not necessarily indicate agreement with every rating or comment.</p>
      <table>
        <thead><tr><th>Employee</th><th>Manager / assessor</th></tr></thead>
        <tbody>
          <tr><td>Name/signature: {header.employeeName}</td><td>Name/signature: {header.assessorName}</td></tr>
          <tr><td>Date: ____________________</td><td>Date: ____________________</td></tr>
        </tbody>
      </table>

      {state.error && <div className="authError noprint" style={{ marginTop: 12 }}>{state.error}</div>}
      <div className="actions">
        {!readOnly && (
          <>
            <button type="submit" name="intent" value="save" className="btn light" disabled={pending}>{pending ? "Saving…" : "Save draft"}</button>
            <button type="submit" name="intent" value="submit" className="btn primary" disabled={pending}>
              {isManager ? "Submit manager assessment & complete" : "Submit my self assessment"}
            </button>
          </>
        )}
        <a href={`/reviews/${reviewId}/${role}/pdf`} target="_blank" rel="noopener noreferrer" className="btn light">Download PDF</a>
      </div>
      <div className="foot"><span>Ali-Frame Windows &amp; Doors — {template.title}</span><span>© BLB Consultants Limited T/A Ali-Frame Windows &amp; Doors — Confidential</span></div>
    </form>
  );
}
