// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { isInstallerProfile } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { INCIDENT_SPEC } from "@/lib/incidentSpec";
import { bodyRegions, cond, fieldVisible, regionLabel, type Answers, type Row } from "@/lib/incidentLogic";
import { PdfButton } from "../../PdfButton";
import { setIncidentStatus } from "../actions";

function Figures({ selected }: { selected: string[] }) {
  return (
    <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
      {(["front", "back"] as const).map((view) => (
        <figure key={view} style={{ margin: 0, textAlign: "center", width: 110 }}>
          <svg viewBox="0 0 200 412" style={{ width: "100%", height: "auto" }} role="img" aria-label={`Body, ${view} view`}>
            {bodyRegions(view).map((r) => {
              const on = selected.includes(r.id);
              const p = { fill: on ? "#e5671a" : "#e8ebef", stroke: on ? "#e5671a" : "#9aa4af", strokeWidth: 1.5 };
              return r.shape === "ellipse" ? <ellipse key={r.id} cx={r.attrs.cx} cy={r.attrs.cy} rx={r.attrs.rx} ry={r.attrs.ry} {...p} /> : <rect key={r.id} x={r.attrs.x} y={r.attrs.y} width={r.attrs.width} height={r.attrs.height} rx={r.attrs.rx} {...p} />;
            })}
          </svg>
          <figcaption className="hint">{view === "front" ? "Front" : "Back"}</figcaption>
        </figure>
      ))}
    </div>
  );
}

export default async function IncidentReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ submitted?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { submitted } = await searchParams;
  const r = await prisma.incidentReport.findUnique({ where: { id }, include: { submittedBy: { select: { name: true } } } });
  const installer = isInstallerProfile(user);
  if (!r || (installer && r.submittedById !== user.id)) notFound();
  const a = r.data as Answers;

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>{r.reference} — {r.personName}</h2>
          <div className="subtitle">{r.outcome} · submitted {r.submittedAt.toLocaleDateString("en-NZ")} by {r.submittedBy.name}</div>
        </div>
        <div className="actions">
          <PdfButton href={`/health-safety/incident/${r.id}/pdf`} label="Download PDF" />
          <Link href="/health-safety/incident" className="btn light">← Reports</Link>
        </div>
      </div>

      {submitted && <div className="status green" style={{ display: "inline-block", marginBottom: 10 }}>Report submitted — thank you. The H&amp;S representative has been told.</div>}
      {r.notifiable && (
        <div className="card" style={{ borderLeft: "4px solid #f0a020", background: "#fff4e0" }}>
          <b>Notifiable event.</b> It must be reported to WorkSafe NZ as soon as possible (<a href="tel:0800030040">0800 030 040</a>) and the scene must not be disturbed unless needed to make it safe or help someone.
        </div>
      )}

      {INCIDENT_SPEC.sections.filter((s) => cond(s.show_if, a)).map((s, n) => (
        <div key={s.id} className="card" style={{ marginTop: 12 }}>
          <div className="label">{n + 1}. {s.title}</div>
          <table style={{ marginTop: 6 }}>
            <tbody>
              {s.fields.filter((f) => f.type !== "notice" && f.id !== "signature" && fieldVisible(f, s, a)).map((f) => {
                const v = a[f.id];
                if (f.type === "bodymap") {
                  const sel = (Array.isArray(v) ? v : []) as string[];
                  return (
                    <tr key={f.id}>
                      <td style={{ width: "34%", fontWeight: 700, verticalAlign: "top" }}>{f.label}</td>
                      <td><Figures selected={sel} /><div className="hint" style={{ textAlign: "center", marginTop: 4 }}>{sel.length ? sel.map(regionLabel).join(", ") : "No areas selected"}</div></td>
                    </tr>
                  );
                }
                if (f.type === "repeater") {
                  const rows = (Array.isArray(v) ? v : []) as Row[];
                  return (
                    <tr key={f.id}>
                      <td style={{ width: "34%", fontWeight: 700, verticalAlign: "top" }}>{f.label}</td>
                      <td>{rows.length === 0 ? "—" : rows.map((x, i) => <div key={i}>{i + 1}. {x.action} — {x.responsible}, by {x.due_date}{x.completed_date ? ` (done ${x.completed_date})` : ""}</div>)}</td>
                    </tr>
                  );
                }
                return (
                  <tr key={f.id}>
                    <td style={{ width: "34%", fontWeight: 700, verticalAlign: "top" }}>{f.label}</td>
                    <td style={{ whiteSpace: "pre-wrap" }}>{Array.isArray(v) ? (v as string[]).join(", ") : String(v ?? "—")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      <div className="card" style={{ marginTop: 12 }}>
        <div className="label">Signature</div>
        {r.signature ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.signature} alt="Signature" style={{ height: 70, background: "#fff", borderRadius: 6, border: "1px solid var(--line)" }} />
        ) : (
          <div className="hint">Not signed</div>
        )}
      </div>

      {!installer && (
        <form action={setIncidentStatus.bind(null, r.id, r.status === "Open" ? "Closed" : "Open")} style={{ marginTop: 12 }}>
          <button type="submit" className="btn light">{r.status === "Open" ? "Mark as closed (actions complete)" : "Reopen"}</button>
        </form>
      )}
    </div>
  );
}
