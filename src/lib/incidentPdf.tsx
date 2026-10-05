// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import "server-only";
import { Ellipse, Image, Rect, Svg, Text as SvgText } from "@react-pdf/renderer";
import { Doc, Footer, Header, KV, Page, PTable, Text, View, pdf, renderToBuffer } from "@/lib/pdfKit";
import { INCIDENT_SPEC } from "@/lib/incidentSpec";
import { bodyRegions, cond, fieldVisible, regionLabel, type Answers, type Row } from "@/lib/incidentLogic";

export interface IncidentPdfInput {
  reference: string;
  status: string;
  submittedAt: Date;
  submittedBy: string;
  answers: Answers;
  signature: string | null;
}

function BodyFigures({ selected }: { selected: string[] }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", marginVertical: 6 }}>
      {(["front", "back"] as const).map((view) => (
        <View key={view} style={{ alignItems: "center", marginHorizontal: 18 }}>
          <Svg width={80} height={165} viewBox="0 0 200 412">
            {bodyRegions(view).map((r) => {
              const on = selected.includes(r.id);
              const fill = on ? "#E5671A" : "#E8EBEF";
              const stroke = on ? "#E5671A" : "#9AA4AF";
              return r.shape === "ellipse" ? (
                <Ellipse key={r.id} cx={r.attrs.cx} cy={r.attrs.cy} rx={r.attrs.rx} ry={r.attrs.ry} fill={fill} stroke={stroke} strokeWidth={1.5} />
              ) : (
                <Rect key={r.id} x={r.attrs.x} y={r.attrs.y} width={r.attrs.width} height={r.attrs.height} rx={r.attrs.rx} fill={fill} stroke={stroke} strokeWidth={1.5} />
              );
            })}
            <SvgText x={14} y={150} style={{ fontSize: 14 }} fill="#5C6773">{view === "front" ? "R" : "L"}</SvgText>
            <SvgText x={186} y={150} style={{ fontSize: 14 }} fill="#5C6773">{view === "front" ? "L" : "R"}</SvgText>
          </Svg>
          <Text style={[pdf.small, { marginTop: 2 }]}>{view === "front" ? "Front" : "Back"}</Text>
        </View>
      ))}
    </View>
  );
}

/** The completed accident / incident report as a professional PDF. Contains health information — handle accordingly. */
export async function generateIncidentPdf(i: IncidentPdfInput): Promise<Buffer> {
  const a = i.answers;
  const when = i.submittedAt.toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" });
  return renderToBuffer(
    <Doc title={`${i.reference} — accident / incident report`}>
      <Page size="A4" style={pdf.page}>
        <Header title="ACCIDENT / INCIDENT REPORT" sub={`${i.reference} · ${INCIDENT_SPEC.title}`} />
        <View style={pdf.panel}>
          <View style={pdf.panelCol}>
            <Text style={pdf.label}>Person involved</Text>
            <Text>{String(a.name ?? "—")}</Text>
            <Text style={pdf.small}>Site: {String(a.site_name ?? "—")}</Text>
          </View>
          <View style={pdf.panelCol}>
            <Text style={pdf.label}>Report</Text>
            <Text>{i.reference} · {String(a.outcome ?? "—")}</Text>
            <Text style={pdf.small}>Submitted {when} by {i.submittedBy} · {i.status}</Text>
          </View>
        </View>
        <Text style={[pdf.small, { marginTop: 6, color: "#C8102E" }]}>CONFIDENTIAL — contains health information (Privacy Act 2020). H&amp;S and management only.</Text>

        {INCIDENT_SPEC.sections
          .filter((s) => cond(s.show_if, a))
          .map((s, n) => {
            const fields = s.fields.filter((f) => f.type !== "notice" && f.id !== "signature" && fieldVisible(f, s, a));
            const rows: [string, string][] = [];
            let bodymap: string[] | null = null;
            let repeater: { label: string; rows: Row[] } | null = null;
            for (const f of fields) {
              const v = a[f.id];
              if (f.type === "bodymap") {
                bodymap = Array.isArray(v) ? (v as string[]) : [];
                continue;
              }
              if (f.type === "repeater") {
                repeater = { label: f.label ?? f.id, rows: Array.isArray(v) ? (v as Row[]) : [] };
                continue;
              }
              rows.push([f.label ?? f.id, Array.isArray(v) ? (v as string[]).join(", ") : String(v ?? "")]);
            }
            return (
              <View key={s.id} wrap={false}>
                <Text style={pdf.h2}>{n + 1}. {s.title}</Text>
                {rows.length > 0 && <KV rows={rows} labelW={1.3} />}
                {bodymap && (
                  <View>
                    <Text style={pdf.label}>Location of injury</Text>
                    <BodyFigures selected={bodymap} />
                    <Text style={pdf.p}>{bodymap.length ? bodymap.map(regionLabel).join(", ") : "No areas selected"}</Text>
                  </View>
                )}
                {repeater && (
                  <View>
                    <Text style={pdf.label}>{repeater.label}</Text>
                    <PTable
                      size={8}
                      cols={[{ label: "Action required", w: 3 }, { label: "Person responsible", w: 1.5 }, { label: "By when" }, { label: "Date completed" }]}
                      rows={repeater.rows.length ? repeater.rows.map((r) => [r.action, r.responsible, r.due_date, r.completed_date]) : [["None recorded", "", "", ""]]}
                    />
                  </View>
                )}
              </View>
            );
          })}

        <View wrap={false}>
          <Text style={pdf.h2}>Signature</Text>
          {i.signature ? <Image src={i.signature} style={{ width: 200, height: 70, objectFit: "contain" }} /> : <Text style={pdf.small}>(not signed)</Text>}
          <Text style={pdf.small}>Signed by {String(a.completed_by_name ?? "")}, {String(a.completed_by_position ?? "")} · form completed {String(a.date_completed ?? "")}</Text>
        </View>
        <Footer />
      </Page>
    </Doc>,
  );
}
