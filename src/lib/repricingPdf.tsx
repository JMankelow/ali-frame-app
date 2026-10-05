// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import "server-only";
import { Doc, Footer, Header, Page, Text, View, pdf, renderToBuffer } from "@/lib/pdfKit";
import { formatMoney } from "./repricing";
import type { RepricingLine } from "./repricing";

export interface RepricingPdfInput {
  jobNumber: string;
  clientName: string;
  siteAddress: string;
  date: string;
  lines: RepricingLine[];
  total: number;
  gstBasis: "excluding" | "including";
}

function RepricingDocument(i: RepricingPdfInput) {
  return (
    <Doc title={`Revised install pricing — job ${i.jobNumber}`}>
      <Page size="A4" style={pdf.page}>
        <Header title="REVISED INSTALL PRICING" sub={`Job ${i.jobNumber}`} />

        <View style={pdf.panel}>
          <View style={pdf.panelCol}>
            <Text style={pdf.label}>Prepared for</Text>
            <Text>{i.clientName}</Text>
            <Text>{i.siteAddress || "—"}</Text>
          </View>
          <View style={pdf.panelCol}>
            <Text style={pdf.label}>Details</Text>
            <Text>Job: {i.jobNumber}</Text>
            <Text>Date: {i.date}</Text>
          </View>
        </View>

        <Text style={pdf.h2}>Pricing</Text>
        <View style={pdf.th}>
          <Text style={[pdf.thText, { flex: 1 }]}>Description</Text>
          <Text style={[pdf.thText, { width: 100, textAlign: "right" }]}>Amount</Text>
        </View>
        {i.lines.map((l, idx) => (
          <View key={idx} style={pdf.tr} wrap={false}>
            <Text style={{ flex: 1 }}>{l.label}</Text>
            <Text style={{ width: 100, textAlign: "right" }}>{formatMoney(l.amount)}</Text>
          </View>
        ))}

        <View style={pdf.totalBar} wrap={false}>
          <Text style={pdf.totalLabel}>TOTAL</Text>
          <Text>
            <Text style={pdf.totalValue}>{formatMoney(i.total)}</Text>
            <Text style={pdf.totalLabel}> {i.gstBasis === "including" ? "including GST" : "plus GST"}</Text>
          </Text>
        </View>

        <Text style={pdf.h2}>Warranty</Text>
        <Text>10-year joinery, 12-year glass, 2-year installation and 2-year hardware.</Text>

        <Footer />
      </Page>
    </Doc>
  );
}

export async function generateRepricingPdf(input: RepricingPdfInput): Promise<Buffer> {
  return renderToBuffer(RepricingDocument(input));
}
