// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import "server-only";
import { Bullet, Doc, Footer, Header, KV, PTable, Page, SignLine, Text, View, pdf, renderToBuffer, type PCell } from "@/lib/pdfKit";
import {
  FEEDBACK_QUESTIONS,
  fmt1,
  scoreRatings,
  type OutcomeData,
  type Ratings,
  type ReviewTemplateDef,
} from "@/lib/reviewTemplates";

const long = (d: Date | null | undefined) => (d ? d.toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" }) : "—");
const GREEN = "#DCFCE7";
const AMBER = "#FEF3C7";
const RED = "#FEE2E2";
const shade = (r: number | null | undefined) => (r == null ? undefined : r >= 3 ? GREEN : r === 2 ? AMBER : RED);
const sgn = (n: number, d = 0) => `${n >= 0 ? "+" : ""}${n.toFixed(d)}`;

export interface OutcomePdfInput {
  tpl: ReviewTemplateDef;
  employeeName: string;
  assessorName: string | null;
  period: string;
  currentLevel: string | null;
  hoursPattern: string | null;
  assessmentDate: Date | null;
  completedAt: Date | null;
  nextReviewDate: Date | null;
  employeeComments: string | null;
  employeeAckAt: Date | null;
  managerAckAt: Date | null;
  selfRatings: Ratings;
  mgrRatings: Ratings;
  mgrNotes: Record<string, string>;
  outcome: OutcomeData;
}

export async function generateOutcomePdf(i: OutcomePdfInput): Promise<Buffer> {
  const { tpl, outcome: o } = i;
  const selfS = scoreRatings(tpl, i.selfRatings);
  const mgrS = scoreRatings(tpl, i.mgrRatings);
  const first = i.employeeName.split(" ")[0];
  const items = tpl.sections.reduce((n, s) => n + s.items.length, 0);
  const diff = (a: number | null, b: number | null) => (a == null || b == null ? "—" : sgn(b - a, 2));
  const best = [...mgrS.sections].filter((s) => s.average != null).sort((a, b) => (b.average ?? 0) - (a.average ?? 0)).slice(0, 3);
  const weakest = [...mgrS.sections].filter((s) => s.average != null).sort((a, b) => (a.average ?? 0) - (b.average ?? 0)).slice(0, 3);
  const lowItems = tpl.sections.flatMap((s) => s.items.filter((it) => i.mgrRatings[it.key]?.r != null && (i.mgrRatings[it.key].r as number) < 3).map((it) => `${it.competency} (${i.mgrRatings[it.key].r})`));
  const lines = (t: string) => t.split("\n").map((l) => l.trim()).filter(Boolean);

  return renderToBuffer(
    <Doc title={`360 Review Outcome — ${i.employeeName}`}>
      <Page size="A4" style={pdf.page}>
        <Header title="360 REVIEW OUTCOME" sub="& Development Plan" />
        <Text style={[pdf.small, { marginTop: 8 }]}>
          {tpl.name} Competency Assessment (360 Review) · Assessment date: {long(i.assessmentDate ?? i.completedAt)}
        </Text>

        <Text style={pdf.h2}>Assessment summary</Text>
        <KV
          rows={[
            ["Employee", i.employeeName],
            ["Current level", o.currentLevel || i.currentLevel],
            ["Manager / assessor", i.assessorName],
            ["Assessment date", long(i.assessmentDate)],
            ["Review period", i.period],
            ["Hours / work pattern", i.hoursPattern],
            ["360 contributors", "Self | Manager"],
            ["Next review", long(i.nextReviewDate)],
          ]}
        />

        <Text style={pdf.h2}>1. At a glance</Text>
        <PTable
          cols={[{ label: "Measure", w: 2.4 }, { label: "Self", align: "right" }, { label: "Manager", align: "right" }, { label: "Difference", align: "right" }]}
          rows={[
            ["Competencies rated", `${selfS.rated} of ${items}`, `${mgrS.rated} of ${items}`, "—"],
            ["Total score", `${selfS.total} / ${selfS.rated * 5}`, `${mgrS.total} / ${mgrS.rated * 5}`, sgn(mgrS.total - selfS.total)],
            ["Overall average (total ÷ items rated)", fmt1(selfS.average), fmt1(mgrS.average), diff(selfS.average, mgrS.average)],
            ["Percentage of maximum", `${fmt1(selfS.percent, 1)}%`, `${fmt1(mgrS.percent, 1)}%`, selfS.percent != null && mgrS.percent != null ? `${sgn(mgrS.percent - selfS.percent, 1)} pts` : "—"],
            ["Competencies rated 3+ (competent)", `${selfS.atLeastThree} of ${selfS.rated}`, `${mgrS.atLeastThree} of ${mgrS.rated}`, "—"],
          ]}
        />

        <Text style={pdf.h2}>Where {first} is</Text>
        <Text style={pdf.p}>
          The manager&apos;s overall average of {fmt1(mgrS.average)} places {first} {mgrS.average != null && mgrS.average >= 3 ? "at or above" : "just below"} “Competent” (3.0) across the full framework.
          {o.recommendedLevel ? ` Recommended level: ${o.recommendedLevel}.` : ""} {o.notes ?? ""}
        </Text>

        {(o.strengths || best.length > 0) && (
          <View>
            <Text style={pdf.h2}>Key strengths</Text>
            {o.strengths ? lines(o.strengths).map((l, n) => <Bullet key={n}>{l}</Bullet>) : best.map((s) => <Bullet key={s.key}>{`${s.title} — manager average ${fmt1(s.average)}`}</Bullet>)}
          </View>
        )}
        {(o.priorities || weakest.length > 0) && (
          <View>
            <Text style={pdf.h2}>Priority development areas</Text>
            {o.priorities ? lines(o.priorities).map((l, n) => <Bullet key={n}>{l}</Bullet>) : weakest.map((s) => <Bullet key={s.key}>{`${s.title} — manager average ${fmt1(s.average)}`}</Bullet>)}
            {lowItems.length > 0 && <Bullet>{`Rated below 3: ${lowItems.join("; ")}`}</Bullet>}
          </View>
        )}
        <Footer />
      </Page>

      <Page size="A4" style={pdf.page}>
        <Header title="360 REVIEW OUTCOME" sub={i.employeeName} />
        <Text style={pdf.h2}>2. How the scores were calculated</Text>
        <Text style={pdf.p}>Rating scale: 1 Not yet competent · 2 Developing · 3 Competent · 4 Advanced · 5 Expert / leader · N/O Not observed. Items rated N/O or left blank are excluded from totals and averages.</Text>
        <KV
          rows={[
            ["Section total", "Sum of the ratings for every rated competency in the section"],
            ["Section average", "Section total ÷ number of rated competencies in the section"],
            ["Section % of maximum", "Section total ÷ (number of rated competencies × 5)"],
            ["Overall total", "Sum of all section totals"],
            ["Overall average", "Overall total ÷ number of rated competencies"],
            ["Variance", "Manager rating minus Self rating (positive = manager rated higher)"],
            ["Standard met", "Manager rating of 3 (Competent) or above"],
          ]}
        />

        <Text style={pdf.h2}>Section summary</Text>
        <PTable
          size={8}
          cols={[{ label: "Section", w: 2.6 }, { label: "Items (S/M)", align: "center" }, { label: "Self total", align: "right" }, { label: "Self avg", align: "right" }, { label: "Mgr total", align: "right" }, { label: "Mgr avg", align: "right" }, { label: "Mgr %", align: "right" }]}
          rows={[
            ...tpl.sections.map((s, n): PCell[] => [
              `${n + 1}. ${s.title}`,
              `${selfS.sections[n].rated}/${mgrS.sections[n].rated}`,
              `${selfS.sections[n].total}/${selfS.sections[n].rated * 5}`,
              fmt1(selfS.sections[n].average),
              `${mgrS.sections[n].total}/${mgrS.sections[n].rated * 5}`,
              { t: fmt1(mgrS.sections[n].average), bg: mgrS.sections[n].average != null ? (mgrS.sections[n].average! >= 3 ? GREEN : AMBER) : undefined, bold: true },
              mgrS.sections[n].percent != null ? `${Math.round(mgrS.sections[n].percent!)}%` : "—",
            ]),
            [{ t: "Overall", bold: true }, `${selfS.rated}/${mgrS.rated}`, `${selfS.total}/${selfS.rated * 5}`, fmt1(selfS.average), `${mgrS.total}/${mgrS.rated * 5}`, { t: fmt1(mgrS.average), bold: true }, mgrS.percent != null ? `${mgrS.percent.toFixed(1)}%` : "—"],
          ]}
        />
        <Text style={pdf.small}>Green = section average at or above Competent (3.0); amber = below 3.0.</Text>
        <Footer />
      </Page>

      <Page size="A4" style={pdf.page}>
        <Header title="360 REVIEW OUTCOME" sub={i.employeeName} />
        <Text style={pdf.h2}>3. Detailed competency scoring</Text>
        <Text style={pdf.p}>Ratings are shaded by the manager score: green = 3+ (meets standard), amber = 2 (developing), red = 1 (not yet competent).</Text>
        {tpl.sections.map((s, n) => (
          <View key={s.key} wrap={false}>
            <Text style={[pdf.h2, { fontSize: 10.5, marginTop: 8 }]}>{n + 1}. {s.title}</Text>
            <PTable
              size={8}
              cols={[{ label: "Competency", w: 4 }, { label: "Self", align: "center", w: 0.7 }, { label: "Manager", align: "center", w: 0.9 }, { label: "Var.", align: "center", w: 0.7 }, { label: "Standard met?", w: 1.2 }]}
              rows={[
                ...s.items.map((it): PCell[] => {
                  const sv = i.selfRatings[it.key];
                  const mv = i.mgrRatings[it.key];
                  const sn = sv?.r ?? null;
                  const mn = mv?.r ?? null;
                  return [
                    mv?.c ? `${it.competency}\n${mv.c}` : it.competency,
                    sv?.na ? "N/O" : sn ?? "—",
                    { t: mv?.na ? "N/O" : mn ?? "—", bg: shade(mn), bold: true },
                    sn != null && mn != null ? sgn(mn - sn) : "—",
                    mn == null ? "—" : mn >= 3 ? "Yes" : "No – gap",
                  ];
                }),
                [{ t: "Total", bold: true }, `${selfS.sections[n].total}/${selfS.sections[n].rated * 5}`, `${mgrS.sections[n].total}/${mgrS.sections[n].rated * 5}`, sgn(mgrS.sections[n].total - selfS.sections[n].total), ""],
                ["Average (total ÷ items rated)", fmt1(selfS.sections[n].average), fmt1(mgrS.sections[n].average), "", ""],
              ]}
            />
            {i.mgrNotes[s.key] ? <Text style={[pdf.p, { fontStyle: "italic", fontSize: 8.5 }]}>Section summary / development need: {i.mgrNotes[s.key]}</Text> : null}
          </View>
        ))}
        <Footer />
      </Page>

      <Page size="A4" style={pdf.page}>
        <Header title="360 REVIEW OUTCOME" sub={i.employeeName} />
        <Text style={pdf.h2}>4. Assessment outcome</Text>
        <KV
          rows={[
            ["Overall score", `Manager ${mgrS.total} / ${mgrS.rated * 5} (${fmt1(mgrS.average)} average, ${fmt1(mgrS.percent, 1)}%) | Self ${selfS.total} / ${selfS.rated * 5} (${fmt1(selfS.average)} average)`],
            ["Current demonstrated level", o.currentLevel],
            ["Recommended level", o.recommendedLevel],
            ["Recommended pay band", o.payBand],
            ["Placement within band", o.placement],
            ["Essential competency gaps", o.gaps],
            ["Additional evidence required", o.evidenceNeeded],
            ["Authority or scope clarification", o.scope],
            ["Progression decision", o.decision],
            ["Next review date", o.nextReview ? long(new Date(o.nextReview)) : long(i.nextReviewDate)],
            ["Indicative timeframe for recommended level", o.timeframe],
          ]}
        />
        <Text style={[pdf.small, { fontStyle: "italic" }]}>
          The timeframes are a guide to the minimum expected experience only. Pay and progression are not automatic based on time served or an average score. Any remuneration change remains subject to business need, formal approval, the employee employment agreement and an agreed written variation.
        </Text>

        {o.benefits && Object.values(o.benefits).some(Boolean) && (
          <View>
            <Text style={pdf.h2}>Other benefits</Text>
            <PTable cols={[{ label: "Benefit", w: 2 }, { label: "Allocated" }]} rows={tpl.benefits.map((b) => [b.name, o.benefits?.[b.name] || "—"])} />
          </View>
        )}

        <Text style={pdf.h2}>5. Development and accountability plan</Text>
        <PTable
          size={8}
          cols={[{ label: "Priority / competency", w: 1.5 }, { label: "Required action and support", w: 2.2 }, { label: "Owner" }, { label: "Target date" }, { label: "Evidence of completion", w: 1.5 }]}
          rows={(o.plan ?? []).some((p) => p.priority || p.action) ? (o.plan ?? []).filter((p) => p.priority || p.action).map((p) => [p.priority, p.action, p.owner, p.target, p.evidence]) : [["No plan items recorded.", "", "", "", ""]]}
        />

        <Text style={pdf.h2}>Employee comments</Text>
        <View style={{ borderWidth: 0.5, borderColor: "#D8E0E3", padding: 8, minHeight: 40 }}>
          <Text>{i.employeeComments || "—"}</Text>
        </View>

        <View wrap={false}>
          <Text style={pdf.h2}>Acknowledgement</Text>
          <Text style={[pdf.small, { fontStyle: "italic", marginBottom: 14 }]}>
            Signatures acknowledge that the assessment discussion occurred and the outcome and actions were recorded. They do not necessarily indicate agreement with every rating or comment.
          </Text>
          <View style={{ flexDirection: "row" }}>
            <SignLine caption={`Employee — ${i.employeeName}`} value={i.employeeAckAt ? `Acknowledged ${long(i.employeeAckAt)}` : ""} />
            <SignLine caption={`Manager / assessor — ${i.assessorName ?? ""}`} value={i.managerAckAt ? `Completed ${long(i.managerAckAt)}` : ""} />
          </View>
        </View>
        <Footer />
      </Page>

      <Page size="A4" style={pdf.page}>
        <Header title="360 REVIEW OUTCOME" sub={i.employeeName} />
        <Text style={pdf.h2}>Appendix — Level and pay-band framework</Text>
        <PTable
          size={8}
          cols={[{ label: "Classification" }, { label: "Level" }, { label: "Pay band (per hour)" }, { label: "Required progression focus", w: 2 }, { label: "Indicative timeframe" }]}
          rows={tpl.framework.map((f) => [f.classification, f.level, f.payBand, f.focus, f.timeframe])}
        />
        <Text style={[pdf.small, { marginTop: 8 }]}>© BLB Consultants Limited T/A Ali-Frame Windows &amp; Doors — Confidential</Text>
        <Footer />
      </Page>
    </Doc>,
  );
}

// ---------- a self / manager assessment sheet ----------

export interface SheetPdfInput {
  tpl: ReviewTemplateDef;
  role: "self" | "manager";
  employeeName: string;
  assessorName: string | null;
  period: string;
  status: string;
  submittedAt: Date | null;
  ratings: Ratings;
  sectionNotes: Record<string, string>;
  feedback: Record<string, unknown>;
}

export async function generateAssessmentSheetPdf(i: SheetPdfInput): Promise<Buffer> {
  const sc = scoreRatings(i.tpl, i.ratings);
  const title = i.role === "self" ? "SELF ASSESSMENT" : "MANAGER ASSESSMENT";
  const answers = FEEDBACK_QUESTIONS.map((g) => ({ g: g.group, qs: g.qs.map((q) => ({ q: q.q, a: typeof i.feedback[q.key] === "string" ? (i.feedback[q.key] as string) : "" })).filter((x) => x.a) })).filter((g) => g.qs.length);

  return renderToBuffer(
    <Doc title={`${title} — ${i.employeeName}`}>
      <Page size="A4" style={pdf.page}>
        <Header title={title} sub={i.tpl.name} />
        <View style={pdf.panel}>
          <View style={pdf.panelCol}>
            <Text style={pdf.label}>Employee</Text>
            <Text>{i.employeeName}</Text>
            <Text style={pdf.small}>Assessor: {i.assessorName ?? "—"}</Text>
          </View>
          <View style={pdf.panelCol}>
            <Text style={pdf.label}>Review</Text>
            <Text>{i.period}</Text>
            <Text style={pdf.small}>
              {i.status}
              {i.submittedAt ? ` · submitted ${long(i.submittedAt)}` : ""}
            </Text>
          </View>
        </View>

        <Text style={[pdf.p, { marginTop: 10 }]}>
          Overall: {sc.total} / {sc.rated * 5} across {sc.rated} rated competencies — average {fmt1(sc.average)}.
        </Text>

        {i.tpl.sections.map((s, n) => (
          <View key={s.key} wrap={false}>
            <Text style={[pdf.h2, { fontSize: 10.5, marginTop: 8 }]}>{n + 1}. {s.title}</Text>
            <PTable
              size={8}
              cols={[{ label: "Competency", w: 3.5 }, { label: "Rating", align: "center", w: 0.8 }, { label: "Comment", w: 3 }]}
              rows={s.items.map((it): PCell[] => {
                const v = i.ratings[it.key];
                return [it.competency, { t: v?.na ? "N/O" : v?.r ?? "—", bg: shade(v?.r), bold: true }, v?.c ?? ""];
              })}
            />
            {i.sectionNotes[s.key] ? <Text style={[pdf.p, { fontSize: 8.5, fontStyle: "italic" }]}>Section notes: {i.sectionNotes[s.key]}</Text> : null}
          </View>
        ))}

        {answers.length > 0 && (
          <View>
            <Text style={pdf.h2}>Development &amp; feedback</Text>
            {answers.map((g) => (
              <View key={g.g}>
                <Text style={{ fontFamily: "Helvetica-Bold", marginTop: 4 }}>{g.g}</Text>
                {g.qs.map((x, n) => (
                  <View key={n} wrap={false} style={{ marginBottom: 4 }}>
                    <Text style={[pdf.small, { fontFamily: "Helvetica-Bold" }]}>{x.q}</Text>
                    <Text style={pdf.p}>{x.a}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
        <Footer />
      </Page>
    </Doc>,
  );
}
