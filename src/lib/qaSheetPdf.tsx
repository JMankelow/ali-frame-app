// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import "server-only";
import { Image } from "@react-pdf/renderer";
import { Doc, Footer, Header, KV, Page, PTable, SignLine, Text, View, pdf, renderToBuffer, type PCell } from "@/lib/pdfKit";
import {
  COM_SECTIONS, RES_CHECKS, RES_CONFIRM, RES_FINAL, RES_REMEDIAL, checkKey, itemName, itemStatus,
  type CommercialData, type ResidentialData,
} from "@/lib/qaSheets";

export type PhotoMap = Record<string, { data: Buffer; format: "jpg" | "png" }>;

interface Common {
  jobNumber: string;
  siteAddress: string;
  clientName: string | null;
  createdBy: string;
  status: string;
  photos: PhotoMap;
}

const nz = (iso: string) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("en-NZ", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const stamp = (iso: string) => (iso ? new Date(iso).toLocaleString("en-NZ", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");
const GREEN = "#DCFCE7";
const RED = "#FEE2E2";
const GREY = "#E5E7EB";

function PhotoGrid({ ids, photos }: { ids: string[]; photos: PhotoMap }) {
  const shown = ids.filter((id) => photos[id]);
  if (!shown.length) return <Text style={pdf.small}>(no photos)</Text>;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {shown.map((id) => (
        <View key={id} wrap={false} style={{ width: 160, height: 120, marginRight: 8, marginBottom: 8, borderWidth: 0.5, borderColor: "#D8E0E3", backgroundColor: "#FAFBFB" }}>
          <Image src={{ data: photos[id].data, format: photos[id].format }} style={{ width: 160, height: 120, objectFit: "contain" }} />
        </View>
      ))}
    </View>
  );
}

function Panel({ c, title, date }: { c: Common; title: string; date: string }) {
  return (
    <View style={pdf.panel}>
      <View style={pdf.panelCol}>
        <Text style={pdf.label}>Site / job</Text>
        <Text>{c.jobNumber}{c.clientName ? ` — ${c.clientName}` : ""}</Text>
        <Text style={pdf.small}>{c.siteAddress}</Text>
      </View>
      <View style={pdf.panelCol}>
        <Text style={pdf.label}>{title}</Text>
        <Text>Date: {nz(date)}</Text>
        <Text style={pdf.small}>Started by {c.createdBy} · {c.status}</Text>
      </View>
    </View>
  );
}

export async function generateResidentialQaPdf(d: ResidentialData, c: Common): Promise<Buffer> {
  const ans = (n: number): PCell[] => {
    const x = d.answers[`q${n}`];
    return [String(n), "", { t: x?.a || "—", bg: x?.a === "Yes" ? GREEN : x?.a === "No" ? RED : undefined, bold: true }, x?.reason ?? ""];
  };
  const row = (n: number, t: string): PCell[] => {
    const r = ans(n);
    r[1] = t;
    return r;
  };
  return renderToBuffer(
    <Doc title={`Residential QA check sheet — job ${c.jobNumber}`}>
      <Page size="A4" style={pdf.page}>
        <Header title="RESIDENTIAL QA CHECK SHEET" sub={`Job ${c.jobNumber}`} />
        <Panel c={c} title="Check sheet" date={d.date} />

        <Text style={pdf.h2}>QA checks</Text>
        <PTable cols={[{ label: "#", w: 0.4 }, { label: "Check", w: 3 }, { label: "Answer", w: 0.8, align: "center" }, { label: "Reason", w: 2.4 }]} rows={RES_CHECKS.map(([n, t]) => row(n, t))} />

        <Text style={pdf.h2}>Final sign off</Text>
        <PTable cols={[{ label: "#", w: 0.4 }, { label: "Item", w: 3 }, { label: "Answer", w: 0.8, align: "center" }, { label: "Reason", w: 2.4 }]} rows={[row(RES_FINAL[0], RES_FINAL[1]), row(RES_REMEDIAL[0], RES_REMEDIAL[1])]} />

        <View wrap={false}>
          <Text style={pdf.h2}>15. Final completion photo</Text>
          <PhotoGrid ids={d.photoFileIds} photos={c.photos} />
        </View>

        <View wrap={false}>
          <Text style={pdf.h2}>17. Team leader sign off</Text>
          <KV rows={[["Team leader", d.teamLeaderName], ["Confirmation", d.confirmed ? `✓ ${RES_CONFIRM}` : "Not confirmed"]]} />
          <View style={{ flexDirection: "row", marginTop: 12 }}>
            <SignLine caption="Team leader" value={d.teamLeaderName} />
            <SignLine caption="Date" value={nz(d.date)} />
          </View>
        </View>
        <Footer />
      </Page>
    </Doc>,
  );
}

export async function generateCommercialQaPdf(d: CommercialData, c: Common): Promise<Buffer> {
  const items = d.items;
  return renderToBuffer(
    <Doc title={`Commercial QA check sheet — job ${c.jobNumber}`}>
      <Page size="A4" style={pdf.page}>
        <Header title="COMMERCIAL QA CHECK SHEET" sub={`Job ${c.jobNumber}`} />
        <Panel c={c} title="Job QA" date={d.date} />
        {d.installers ? <Text style={[pdf.small, { marginTop: 6 }]}>Installer(s) on site: {d.installers}</Text> : null}

        <Text style={pdf.h2}>Item summary</Text>
        <PTable
          cols={[{ label: "Item", w: 1.6 }, { label: "Location", w: 1.6 }, { label: "Status", w: 1, align: "center" }, { label: "Fails", w: 0.5, align: "center" }, { label: "Signed off by", w: 1.6 }]}
          rows={items.map((it, i): PCell[] => {
            const st = itemStatus(it);
            return [
              itemName(it, i),
              it.loc,
              { t: st.label === "In progress" ? `${st.pct}%` : st.label, bg: st.label === "Complete" ? GREEN : st.label === "In progress" ? "#FEF3C7" : GREY, bold: true },
              { t: st.fails, bg: st.fails ? RED : undefined },
              it.qa.tl.by ? `${it.qa.tl.name || it.qa.tl.by} · ${stamp(it.qa.tl.at)}` : "—",
            ];
          })}
        />
        <Footer />
      </Page>

      {items.map((it, i) => (
        <Page key={it.id} size="A4" style={pdf.page}>
          <Header title="COMMERCIAL QA" sub={`Job ${c.jobNumber} · ${itemName(it, i)}`} />
          <Text style={[pdf.h2, { marginTop: 10 }]}>{itemName(it, i)}{it.loc ? ` — ${it.loc}` : ""}</Text>

          {COM_SECTIONS.map((s) => (
            <View key={s.id}>
              <Text style={[pdf.h2, { fontSize: 10.5, marginTop: 8 }]} minPresenceAhead={50}>{s.title}</Text>
              <PTable
                size={8}
                cols={[{ label: "Check", w: 3 }, { label: "Result", w: 0.7, align: "center" }, { label: "Note / signed", w: 2.2 }]}
                rows={s.checks.map((chk, n): PCell[] => {
                  const x = it.qa.checks[checkKey(s.id, n)];
                  const sigd = x?.by ? `${x.by} · ${stamp(x.at)}` : "";
                  return [chk, { t: x?.r === "NA" ? "N/A" : x?.r || "—", bg: x?.r === "Pass" ? GREEN : x?.r === "Fail" ? RED : x?.r === "NA" ? GREY : undefined, bold: true }, [x?.note, sigd].filter(Boolean).join("\n")];
                })}
              />
              <Text style={pdf.label}>{s.photo}</Text>
              <PhotoGrid ids={it.qa.photos[s.id] ?? []} photos={c.photos} />
              <Text style={pdf.label}>{s.notes}</Text>
              <Text style={pdf.p}>{it.qa.notes[s.id] || "—"}</Text>
            </View>
          ))}

          <View wrap={false}>
            <Text style={pdf.h2}>Team Leader sign off</Text>
            <KV rows={[["Team leader", it.qa.tl.name], ["Date", nz(it.qa.tl.date)], ["Comments", it.qa.tl.comments], ["Stamped", it.qa.tl.by ? `${it.qa.tl.by} · ${stamp(it.qa.tl.at)}` : ""]]} />
            {it.qa.tl.sig ? <Image src={it.qa.tl.sig} style={{ width: 200, height: 70, objectFit: "contain" }} /> : <Text style={pdf.small}>(not signed)</Text>}
          </View>
          <Footer />
        </Page>
      ))}
    </Doc>,
  );
}
