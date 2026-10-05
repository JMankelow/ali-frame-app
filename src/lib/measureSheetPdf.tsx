// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import "server-only";
import { Image } from "@react-pdf/renderer";
import { Doc, Footer, Header, KV, Page, Text, View, pdf, renderToBuffer } from "@/lib/pdfKit";

export interface MeasureSheetOpening {
  index: number;
  fields: Record<string, string>;
  /** PNG bytes of the sketch drawn for this opening. */
  sketch: Buffer | null;
}
export interface MeasureSheetPage {
  pageNum: number;
  header: Record<string, string>;
  openings: MeasureSheetOpening[];
}
export interface MeasureSheetInput {
  jobNumber: string;
  jobTitle: string;
  supplierName: string | null;
  preparedBy: string;
  pages: MeasureSheetPage[];
}

const HEADER_LABELS: [string, string][] = [
  ["notes", "Notes"],
  ["hardware", "Hardware"],
  ["cladding", "Cladding"],
  ["colourMatched", "Colour matched / thermally broken"],
  ["colourFinish", "Colour: powdercoat / anodised"],
  ["accessEquipment", "Access equipment + days"],
  ["rubbishRemoval", "Rubbish removal"],
];
const OPENING_LABELS: [string, string][] = [
  ["location", "Location"],
  ["glazingType", "Glazing type"],
  ["glass", "Glass"],
  ["fallProtection", "Protecting a fall"],
  ["restrictorStays", "Restrictor stays"],
  ["architraves", "Architraves"],
  ["facings", "Facings"],
  ["scribers", "Scribers"],
  ["silicone", "Silicone"],
  ["headFlashing", "Head flashing"],
  ["sillTray", "Sill tray"],
];

function SheetPage({ i, p }: { i: MeasureSheetInput; p: MeasureSheetPage }) {
  const h = p.header;
  return (
    <Page size="A4" style={pdf.page}>
      <Header title="MEASURE SHEET" sub={`Job ${i.jobNumber} · Page ${p.pageNum}`} />

      <View style={pdf.panel}>
        <View style={pdf.panelCol}>
          <Text style={pdf.label}>Customer</Text>
          <Text>{h.customer || "—"}</Text>
          {h.phone ? <Text style={pdf.small}>Phone: {h.phone}</Text> : null}
          {h.email ? <Text style={pdf.small}>Email: {h.email}</Text> : null}
        </View>
        <View style={pdf.panelCol}>
          <Text style={pdf.label}>Site</Text>
          <Text>{h.address || "—"}</Text>
          <Text style={pdf.small}>Date: {h.date || "—"}</Text>
          {i.supplierName ? <Text style={pdf.small}>For: {i.supplierName}</Text> : null}
        </View>
      </View>

      {HEADER_LABELS.some(([k]) => h[k]) && (
        <View style={{ marginTop: 10 }}>
          <KV rows={HEADER_LABELS.filter(([k]) => h[k]).map(([k, label]) => [label, h[k]] as [string, string])} labelW={1.4} />
        </View>
      )}

      {p.openings.map((o) => (
        <View key={o.index} wrap={false} style={{ marginTop: 10 }}>
          <Text style={[pdf.h2, { marginTop: 4, fontSize: 10.5 }]}>
            Opening {o.index}
            {o.fields.location ? ` — ${o.fields.location}` : ""}
          </Text>
          <View style={{ flexDirection: "row" }}>
            <View style={{ width: 300, borderWidth: 0.5, borderColor: "#D8E0E3" }}>
              {o.sketch ? <Image src={{ data: o.sketch, format: "png" }} style={{ width: 300 }} /> : <Text style={[pdf.small, { padding: 10 }]}>No sketch</Text>}
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <KV rows={OPENING_LABELS.filter(([k]) => o.fields[k]).map(([k, label]) => [label, o.fields[k]] as [string, string])} labelW={1.1} />
              {o.fields.extra ? (
                <View>
                  <Text style={pdf.label}>Extra</Text>
                  <Text style={pdf.p}>{o.fields.extra}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      ))}
      <Footer />
    </Page>
  );
}

/** The supplier measure sheet: customer/site details, then each opening's sketch beside its specification. One PDF. */
export async function generateMeasureSheetPdf(i: MeasureSheetInput): Promise<Buffer> {
  return renderToBuffer(
    <Doc title={`Measure sheet — job ${i.jobNumber}`}>
      {i.pages.map((p) => (
        <SheetPage key={p.pageNum} i={i} p={p} />
      ))}
    </Doc>,
  );
}
