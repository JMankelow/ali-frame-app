// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import "server-only";
import { Image } from "@react-pdf/renderer";
import { Doc, Footer, Header, Page, SignLine, Text, View, pdf, renderToBuffer } from "@/lib/pdfKit";

export interface QaPdfInput {
  title: string;
  status: string;
  reportDate: Date;
  jobNumber: string;
  clientName: string | null;
  address: string | null;
  createdBy: string;
  description: string;
  photos: { label: string; description: string; data: Buffer | null; format: "jpg" | "png" | null }[];
}

/** A QA report: every photo labelled, with its description written underneath. */
export async function generateQaReportPdf(i: QaPdfInput): Promise<Buffer> {
  const date = i.reportDate.toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" });
  return renderToBuffer(
    <Doc title={`${i.title} — job ${i.jobNumber}`}>
      <Page size="A4" style={pdf.page}>
        <Header title="QA REPORT" sub={i.title} />

        <View style={pdf.panel}>
          <View style={pdf.panelCol}>
            <Text style={pdf.label}>Job</Text>
            <Text>{i.jobNumber}{i.clientName ? ` — ${i.clientName}` : ""}</Text>
            {i.address ? <Text style={pdf.small}>{i.address}</Text> : null}
          </View>
          <View style={pdf.panelCol}>
            <Text style={pdf.label}>Report</Text>
            <Text>Date: {date}</Text>
            <Text style={pdf.small}>Prepared by {i.createdBy} · {i.status}</Text>
          </View>
        </View>

        {i.description ? (
          <View>
            <Text style={pdf.h2}>Overview</Text>
            <Text style={pdf.p}>{i.description}</Text>
          </View>
        ) : null}

        <Text style={pdf.h2}>Photos</Text>
        {i.photos.map((p, n) => (
          <View key={n} wrap={false} style={{ marginBottom: 14 }}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10.5, marginBottom: 4 }}>
              Photo {n + 1} — {p.label || "(no label)"}
            </Text>
            {p.data && p.format ? (
              <View style={{ width: 340, height: 255, borderWidth: 0.5, borderColor: "#D8E0E3", backgroundColor: "#FAFBFB" }}>
                <Image src={{ data: p.data, format: p.format }} style={{ width: 340, height: 255, objectFit: "contain" }} />
              </View>
            ) : (
              <Text style={pdf.small}>(photo could not be included)</Text>
            )}
            {p.description ? <Text style={[pdf.p, { marginTop: 5 }]}>{p.description}</Text> : null}
          </View>
        ))}

        <View wrap={false} style={{ marginTop: 10 }}>
          <Text style={pdf.h2}>Sign-off</Text>
          <View style={{ flexDirection: "row", marginTop: 10 }}>
            <SignLine caption="Prepared by" value={i.createdBy} />
            <SignLine caption="Date" value={date} />
          </View>
        </View>
        <Footer />
      </Page>
    </Doc>,
  );
}
