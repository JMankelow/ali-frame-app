// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import "server-only";
import { Image, Page, Text, View } from "@react-pdf/renderer";
import { PDFDocument } from "pdf-lib";
import { Doc, logoData, renderToBuffer } from "@/lib/pdfKit";
import { dollars, labourLine, parsePageRange, type CheckMeasureData, type CheckMeasureItem } from "@/lib/checkMeasure";

// The approved AliFrame check-measure layout (Tanya, 26/09/2026): questionnaire page, technical schedule with item cards
// (two per page), client declaration and operations completion under the last item.
const BLUE = "#00AEEF";
const RED = "#CC0000";
const mm = (n: number) => n * 2.835;

const s = {
  page1: { paddingTop: mm(11), paddingHorizontal: mm(14), paddingBottom: mm(18), fontFamily: "Helvetica", color: "#000", fontSize: 11 },
  logo: { height: mm(13), alignSelf: "center" as const, marginBottom: mm(5) },
  bar: { backgroundColor: BLUE, color: "#fff", textAlign: "center" as const, fontFamily: "Helvetica-Bold", fontSize: 14, padding: mm(2.2), marginBottom: mm(5) },
  cell: { borderWidth: 0.75, borderColor: "#000", padding: mm(1.6) },
  h2: { color: BLUE, fontFamily: "Helvetica-Bold", fontSize: 12, marginTop: mm(7), marginBottom: mm(1.5), paddingBottom: mm(1), borderBottomWidth: 1.5, borderBottomColor: BLUE },
  footer: { position: "absolute" as const, bottom: mm(8), left: mm(14), right: mm(14), flexDirection: "row" as const, justifyContent: "space-between" as const, fontSize: 7.5, borderTopWidth: 0.75, borderTopColor: "#ccc", paddingTop: mm(1.5) },
};

function Footer() {
  return (
    <View style={s.footer} fixed>
      <Text>BLB Consultants Limited T/A Aliframe Windows &amp; Doors ©  |  PO Box 259092, Botany, Auckland, 2163</Text>
      <Text render={({ pageNumber }) => `Aliframe 2026  |  Page ${pageNumber}`} />
    </View>
  );
}

function Logo() {
  // eslint-disable-next-line jsx-a11y/alt-text
  return <Image src={{ data: logoData(), format: "png" }} style={s.logo} />;
}

const lines = (t: string) => t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

function IdRow({ cells }: { cells: { v: string; w: number }[] }) {
  return (
    <View style={{ flexDirection: "row" }}>
      {cells.map((c, i) => (
        <Text key={i} style={[s.cell, { flex: c.w, fontFamily: "Helvetica-Bold", fontSize: 12 }]}>{c.v}</Text>
      ))}
    </View>
  );
}

function CostRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: "row" }} wrap={false}>
      <Text style={[s.cell, { width: "28%", fontFamily: "Helvetica-Bold", backgroundColor: "#fafafa", fontSize: 12 }]}>{label}</Text>
      <Text style={[s.cell, { flex: 1, fontSize: 12, ...(bold ? { fontFamily: "Helvetica-Bold" } : {}) }]}>{value || " "}</Text>
    </View>
  );
}

function ItemCard({ d, it, n, jobNumber }: { d: CheckMeasureData; it: CheckMeasureItem; n: number; jobNumber: string }) {
  const rows: [string, string][] = [
    ["AliFrame Job No.", jobNumber],
    ["Customer / Quote Title", d.clientName],
    ["Site Address", d.siteAddress],
    ["Colour / Finish", it.colour],
    ["Item / Location", `Item ${n} – ${it.location}`.replace(/ – $/, "")],
    ["Quantity / Level", `${it.quantity || "1"} / ${it.level || "–"}`],
    ["Frame Type & Trim Size", [it.frameType, it.trimSize].filter(Boolean).join(", ")],
    ["Reveal", it.reveal],
    ["Hardware & Finish", it.hardware],
    ["Wind Loading", it.windLoading],
    ["Glass", it.glass],
    ["Flashing / Sill", it.flashing],
    ["Notes", it.notes],
  ];
  return (
    <View style={{ borderWidth: 1.5, borderColor: BLUE, marginBottom: mm(5) }} wrap={false}>
      <View style={{ backgroundColor: BLUE, flexDirection: "row", justifyContent: "space-between", padding: mm(1.8), paddingHorizontal: mm(3) }}>
        <Text style={{ color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 12 }}>Item {n}{it.location ? `: ${it.location}` : ""}</Text>
        <Text style={{ color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 12 }}>Qty {it.quantity || "1"}</Text>
      </View>
      <View style={{ flexDirection: "row", padding: mm(3) }}>
        <View style={{ width: mm(78), marginRight: mm(4) }}>
          <View style={{ borderWidth: 0.75, borderColor: "#999", borderStyle: "dashed", height: mm(46), alignItems: "center", justifyContent: "center", padding: 6 }}>
            <Text style={{ fontSize: 9, color: "#555", textAlign: "center" }}>Supplier elevation drawing — see the supplier schedule pages at the back of this pack</Text>
            {(it.width || it.height) && <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 6 }}>{it.width || "—"} wide × {it.height || "—"} high (mm)</Text>}
          </View>
        </View>
        <View style={{ flex: 1 }}>
          {rows.map(([k, v], i) =>
            v ? (
              <View key={i} style={{ flexDirection: "row", paddingVertical: 1 }}>
                <Text style={{ width: mm(38), fontSize: 9.5 }}>{k}</Text>
                <Text style={{ flex: 1, fontSize: 9.5, color: BLUE, fontFamily: "Helvetica-Bold" }}>{v}</Text>
              </View>
            ) : null,
          )}
        </View>
      </View>
      <View style={{ borderWidth: 1.2, borderColor: RED, marginLeft: "auto", marginRight: mm(3), marginBottom: mm(3), width: "62%", padding: mm(2), height: mm(30) }}>
        <Text style={{ color: RED, fontFamily: "Helvetica-Bold", fontSize: 9.5, lineHeight: 1.5 }}>H/F:{"\n"}S/Tray:{"\n"}TWT:{"\n"}Installation Notes:</Text>
      </View>
    </View>
  );
}

function SignRow({ items }: { items: { label: string; w: number }[] }) {
  return (
    <View style={{ flexDirection: "row", marginTop: mm(3) }}>
      {items.map((i, n) => (
        <View key={n} style={{ flexDirection: "row", flex: i.w, marginRight: mm(4) }}>
          <Text style={{ fontSize: 10 }}>{i.label} </Text>
          <View style={{ flex: 1, borderBottomWidth: 0.75, borderBottomColor: "#000", marginLeft: 3 }} />
        </View>
      ))}
    </View>
  );
}

function CheckMeasureDocument({ jobNumber, d }: { jobNumber: string; d: CheckMeasureData }) {
  const labour = d.labourLines.trim() ? lines(d.labourLines) : [labourLine(d.installAmount, d.teamSize)].filter(Boolean);
  const summary = lines(d.summary);
  const notes = lines(d.notes);
  const items = d.items.filter((it) => Object.entries(it).some(([k, v]) => k !== "quantity" && v));
  const list = items.length ? items : d.items.slice(0, 1);

  return (
    <Doc title={`${jobNumber} Check Measure Sheet`}>
      {/* ---- Page 1: questionnaire ---- */}
      <Page size="A4" style={s.page1}>
        <Logo />
        <Text style={s.bar}>RESIDENTIAL QUESTIONNAIRE FOR CHECK MEASURE</Text>
        <IdRow cells={[{ v: "Client", w: 1.2 }, { v: d.clientName, w: 2 }, { v: "AliFrame Job No.", w: 1.2 }, { v: jobNumber, w: 1.3 }]} />
        <IdRow cells={[{ v: "AliFrame Quote No.", w: 1.2 }, { v: d.quoteNumber, w: 2 }, { v: "Supplier", w: 1.2 }, { v: d.supplierName, w: 1.3 }]} />
        <IdRow cells={[{ v: "Site Address", w: 1.2 }, { v: d.siteAddress, w: 4.5 }]} />

        <Text style={s.h2}>COSTINGS — INTERNAL / OPERATIONS ONLY</Text>
        <View>
          {labour.length ? labour.map((l, i) => <CostRow key={i} label={i === 0 ? "Labour Allowance" : ""} value={l} bold />) : <CostRow label="Labour Allowance" value="" />}
          <CostRow label="Materials" value={dollars(d.materials) || d.materials} />
          <CostRow label="Rubbish Removal" value={d.rubbish ? (/^\s*\$?[\d,.]+\s*$/.test(d.rubbish) ? dollars(d.rubbish) : d.rubbish) : ""} />
          <CostRow label="Scaffolding / Access" value={d.scaffolding} />
          <CostRow label="Other Information" value={d.otherInfo} />
        </View>

        <Text style={s.h2}>QUOTE SUMMARY &amp; INSTALLATION NOTES / EXCLUSIONS</Text>
        <View style={{ borderWidth: 0.75, borderColor: "#000", padding: mm(2.5) }}>
          {summary.map((l, i) => <Text key={i} style={{ fontSize: 12, lineHeight: 1.4 }}>{l}</Text>)}
          {notes.length > 0 && <View style={{ marginTop: mm(1.5) }}>{notes.map((l, i) => (
            <View key={i} style={{ flexDirection: "row", marginBottom: 2 }}>
              <Text style={{ width: mm(6), fontSize: 12 }}>•</Text>
              <Text style={{ flex: 1, fontSize: 12, lineHeight: 1.4 }}>{l}</Text>
            </View>
          ))}</View>}
        </View>
        <Footer />
      </Page>

      {/* ---- Technical schedule ---- */}
      <Page size="A4" style={{ ...s.page1, paddingTop: mm(56) }}>
        <View fixed style={{ position: "absolute", top: mm(11), left: mm(14), right: mm(14) }}>
          <Logo />
          <Text style={{ ...s.bar, marginBottom: mm(2) }}>TECHNICAL SCHEDULE – CHECK MEASURE</Text>
          <Text style={{ textAlign: "center", fontSize: 9.5, fontFamily: "Helvetica-Bold" }}>
            AliFrame Job No. {jobNumber}  •  Item Units: {list.length}  •  ALL UNITS VIEWED FROM OUTSIDE
          </Text>
        </View>
        {list.map((it, i) => (
          <ItemCard key={i} d={d} it={it} n={i + 1} jobNumber={jobNumber} />
        ))}

        <View style={{ borderWidth: 1.2, borderColor: RED, marginTop: mm(2), padding: mm(3) }} wrap={false}>
          <Text style={{ color: RED, fontFamily: "Helvetica-Bold", fontSize: 12, marginBottom: mm(2) }}>Client Declaration</Text>
          <Text style={{ fontSize: 10, marginBottom: mm(2), lineHeight: 1.3 }}>I have checked all configurations including but not limited to the openings, the hardware, styles and colours, and confirm they are true and correct.</Text>
          <Text style={{ fontSize: 10, marginBottom: mm(2), lineHeight: 1.3 }}>I understand that once the order has been placed it cannot be changed and further costs may be incurred.</Text>
          <SignRow items={[{ label: "Client name:", w: 1 }]} />
          <SignRow items={[{ label: "Client signature:", w: 2 }, { label: "Date:", w: 1 }]} />
        </View>

        <View style={{ borderWidth: 1.2, borderColor: "#000", marginTop: mm(4), padding: mm(3) }} wrap={false}>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11, marginBottom: mm(1.5) }}>Operations Completion</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {["All items checked", "Discrepancies recorded", "Ready for order"].map((t) => (
              <View key={t} style={{ width: "50%", flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
                <View style={{ width: mm(3.4), height: mm(3.4), borderWidth: 0.75, borderColor: "#000", marginRight: 4 }} />
                <Text style={{ fontSize: 10 }}>{t}</Text>
              </View>
            ))}
            <Text style={{ width: "50%", fontSize: 10 }}>Checked by: Tristam</Text>
          </View>
          <SignRow items={[{ label: "Signature:", w: 2 }, { label: "Date:", w: 1 }]} />
        </View>
        <Footer />
      </Page>
    </Doc>
  );
}

/** The check-measure pack: the AliFrame pages, then the supplier's own drawing pages (the selected pages of their schedule PDF). */
export async function generateCheckMeasurePdf(jobNumber: string, d: CheckMeasureData, supplierPdf?: Buffer | null): Promise<Buffer> {
  const main = await renderToBuffer(<CheckMeasureDocument jobNumber={jobNumber} d={d} />);
  const pages = supplierPdf ? parsePageRange(d.supplierPages) : [];
  if (!supplierPdf || pages.length === 0) return main;

  const out = await PDFDocument.load(main);
  const src = await PDFDocument.load(supplierPdf, { ignoreEncryption: true });
  const idx = pages.map((p) => p - 1).filter((p) => p >= 0 && p < src.getPageCount());
  const copied = await out.copyPages(src, idx);
  copied.forEach((p) => out.addPage(p));
  return Buffer.from(await out.save());
}
