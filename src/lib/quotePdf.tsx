import "server-only";
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import path from "path";

// Matches Jo's "Sales - Prepare Quote Wording" skill output shape: one
// headline "Total $[amount] + GST" figure (bold red), then the finished
// copy-ready wording underneath — no itemised breakdown.
const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica" },
  logo: { width: 160, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4, color: "#0057b8" },
  subtitle: { fontSize: 10, color: "#64748b", marginBottom: 16 },
  totalLine: { fontSize: 16, fontWeight: 700, color: "#dc2626", marginBottom: 18 },
  wording: { fontSize: 11, lineHeight: 1.5 },
});

export interface QuotePdfInput {
  quoteNumber: string;
  clientName: string;
  date: string;
  totalLine: string; // e.g. "Total $12,345.67 + GST"
  wording: string;
}

function QuoteDocument(input: QuotePdfInput) {
  const logoPath = path.join(process.cwd(), "public", "aliframe-logo.png");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={logoPath} style={styles.logo} />
        <Text style={styles.title}>Quotation</Text>
        <Text style={styles.subtitle}>
          {input.quoteNumber} — {input.clientName} — {input.date}
        </Text>
        <Text style={styles.totalLine}>{input.totalLine}</Text>
        {input.wording.split("\n").map((line, i) => (
          <Text key={i} style={styles.wording}>
            {line || " "}
          </Text>
        ))}
      </Page>
    </Document>
  );
}

export async function generateQuotePdf(input: QuotePdfInput): Promise<Buffer> {
  return renderToBuffer(QuoteDocument(input));
}
