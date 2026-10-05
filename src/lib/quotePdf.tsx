// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import "server-only";
import { Bullet, Doc, Footer, Header, Page, Text, View, pdf, renderToBuffer } from "@/lib/pdfKit";

// The finished quote wording (from the Quote Wording skill) laid out as a proper quotation: letterhead,
// who it's for, the details, ONE total, payment terms, warranty and an acceptance block.
export interface QuotePdfInput {
  quoteNumber: string;
  clientName: string;
  date: string;
  validUntil?: string;
  jobNumber?: string;
  siteAddress?: string;
  total: number;
  gstBasis: "excluding" | "including";
  wording: string;
  preparedBy?: string;
}

const nzd = (n: number) => n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" });

function QuoteDocument(i: QuotePdfInput) {
  const lines = i.wording.split(/\r?\n/).map((l) => l.trimEnd());
  // Blank line = paragraph break; lines starting with - or • become bullets.
  const blocks: { bullet: boolean; text: string }[] = [];
  for (const l of lines) {
    const t = l.trim();
    if (!t) continue;
    const m = t.match(/^[-•*]\s+(.*)$/);
    blocks.push({ bullet: !!m, text: m ? m[1] : t });
  }

  return (
    <Doc title={`Quotation ${i.quoteNumber}`}>
      <Page size="A4" style={pdf.page}>
        <Header title="QUOTATION" sub={`Quote ${i.quoteNumber}`} />

        <View style={pdf.panel}>
          <View style={pdf.panelCol}>
            <Text style={pdf.label}>Prepared for</Text>
            <Text>{i.clientName}</Text>
            {i.siteAddress ? <Text>{i.siteAddress}</Text> : null}
          </View>
          <View style={pdf.panelCol}>
            <Text style={pdf.label}>Quote details</Text>
            <Text>Quote number: {i.quoteNumber}</Text>
            {i.jobNumber ? <Text>Reference: JOB-{i.jobNumber}</Text> : null}
            <Text>Date: {i.date}</Text>
            {i.validUntil ? <Text>Valid until: {i.validUntil}</Text> : null}
          </View>
        </View>

        <Text style={pdf.h2}>Scope &amp; details</Text>
        {blocks.map((b, idx) => (b.bullet ? <Bullet key={idx}>{b.text}</Bullet> : <Text key={idx} style={pdf.p}>{b.text}</Text>))}

        <View style={pdf.totalBar} wrap={false}>
          <Text style={pdf.totalLabel}>TOTAL (NZD)</Text>
          <Text>
            <Text style={pdf.totalValue}>{nzd(i.total)}</Text>
            <Text style={pdf.totalLabel}> {i.gstBasis === "excluding" ? "plus GST" : "including GST"}</Text>
          </Text>
        </View>

        <View wrap={false}>
          <Text style={pdf.h2}>Payment terms</Text>
          <Bullet>40% deposit on acceptance of this quotation.</Bullet>
          <Bullet>50% prior to installation.</Bullet>
          <Bullet>10% on completion.</Bullet>

          <Text style={pdf.h2}>Warranty</Text>
          <Text>10-year joinery, 12-year glass, 2-year installation and 2-year hardware.</Text>
        </View>

        <View wrap={false}>
          <Text style={pdf.h2}>Acceptance</Text>
          <Text style={pdf.p}>To accept this quotation, sign below or reply to the email it came with. We&apos;ll then arrange your check measure.</Text>
          <View style={{ flexDirection: "row", marginTop: 16 }}>
            <View style={{ flex: 1, marginRight: 24, borderTopWidth: 0.75, borderTopColor: "#33383D", paddingTop: 3 }}>
              <Text style={pdf.small}>Signed (name)</Text>
            </View>
            <View style={{ width: 110, borderTopWidth: 0.75, borderTopColor: "#33383D", paddingTop: 3 }}>
              <Text style={pdf.small}>Date</Text>
            </View>
          </View>
          <Text style={{ marginTop: 14 }}>Kind regards,</Text>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>{i.preparedBy || "AliFrame Team"}</Text>
        </View>

        <Footer />
      </Page>
    </Doc>
  );
}

export async function generateQuotePdf(input: QuotePdfInput): Promise<Buffer> {
  return renderToBuffer(QuoteDocument(input));
}
