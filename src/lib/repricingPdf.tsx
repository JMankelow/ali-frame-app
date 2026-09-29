import "server-only";
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import path from "path";
import { formatMoney } from "./repricing";
import type { RepricingLine } from "./repricing";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica" },
  logo: { width: 160, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4, color: "#0057b8" },
  subtitle: { fontSize: 10, color: "#64748b", marginBottom: 16 },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 110, color: "#64748b" },
  value: { flex: 1 },
  table: { marginTop: 18, borderTop: "1px solid #e5e7eb" },
  tr: { flexDirection: "row", borderBottom: "1px solid #e5e7eb", paddingVertical: 6 },
  tdDesc: { flex: 1 },
  tdAmount: { width: 90, textAlign: "right" },
  totalRow: { flexDirection: "row", marginTop: 10, paddingTop: 10, borderTop: "2px solid #0057b8" },
  totalLabel: { flex: 1, fontSize: 13, fontWeight: 700, color: "#0f356b" },
  totalValue: { width: 90, textAlign: "right", fontSize: 13, fontWeight: 700, color: "#0057b8" },
  gstBasis: { fontSize: 9, color: "#64748b", marginTop: 6, textAlign: "right" },
  footer: { marginTop: 30, fontSize: 9, color: "#64748b" },
});

export interface RepricingPdfInput {
  jobNumber: string;
  clientName: string;
  siteAddress: string;
  date: string;
  lines: RepricingLine[];
  total: number;
  gstBasis: "excluding" | "including";
}

function RepricingDocument(input: RepricingPdfInput) {
  const logoPath = path.join(process.cwd(), "public", "aliframe-logo.png");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={logoPath} style={styles.logo} />
        <Text style={styles.title}>Revised Install Pricing</Text>
        <Text style={styles.subtitle}>
          Job {input.jobNumber} — {input.date}
        </Text>

        <View style={styles.row}>
          <Text style={styles.label}>Client</Text>
          <Text style={styles.value}>{input.clientName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Site Address</Text>
          <Text style={styles.value}>{input.siteAddress || "—"}</Text>
        </View>

        <View style={styles.table}>
          {input.lines.map((l, i) => (
            <View key={i} style={styles.tr}>
              <Text style={styles.tdDesc}>{l.label}</Text>
              <Text style={styles.tdAmount}>{formatMoney(l.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatMoney(input.total)}</Text>
        </View>
        <Text style={styles.gstBasis}>{input.gstBasis === "including" ? "Prices include GST." : "Prices exclude GST."}</Text>

        <Text style={styles.footer}>
          Warranty: 10-year joinery, 12-year glass, 2-year installation, 2-year hardware.
        </Text>
      </Page>
    </Document>
  );
}

export async function generateRepricingPdf(input: RepricingPdfInput): Promise<Buffer> {
  return renderToBuffer(RepricingDocument(input));
}
