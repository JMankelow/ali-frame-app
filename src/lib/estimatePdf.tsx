import "server-only";
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import path from "path";

// Matches the fixed content rules from Jo's own "Sales - AliFrame Estimate"
// skill: one page, ONE total price only (no line items/subtotals/GST amount/
// deposit), a short scope summary, and the exact footer line inviting a
// formal quotation.
const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica" },
  logo: { width: 160, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4, color: "#0057b8" },
  subtitle: { fontSize: 10, color: "#64748b", marginBottom: 16 },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 110, color: "#64748b" },
  value: { flex: 1 },
  section: { marginTop: 18, marginBottom: 8, fontSize: 12, fontWeight: 700, color: "#111827" },
  scopeItem: { marginBottom: 4 },
  totalBox: { marginTop: 20, padding: 14, backgroundColor: "#eaf6fd", borderRadius: 6 },
  totalLabel: { fontSize: 10, color: "#0f356b" },
  totalValue: { fontSize: 22, fontWeight: 700, color: "#0057b8", marginTop: 2 },
  gstBasis: { fontSize: 9, color: "#64748b", marginTop: 2 },
  footer: { marginTop: 24, fontSize: 9, color: "#64748b" },
});

export interface EstimatePdfInput {
  estimateNumber: string;
  clientName: string;
  siteAddress: string;
  phone: string;
  email: string;
  estimateDate: string;
  validUntil: string;
  scope: string[];
  total: string;
  gstBasis: string;
  assumptions?: string[];
}

function EstimateDocument(input: EstimatePdfInput) {
  const logoPath = path.join(process.cwd(), "public", "aliframe-logo.png");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={logoPath} style={styles.logo} />
        <Text style={styles.title}>Estimate</Text>
        <Text style={styles.subtitle}>
          Estimate #{input.estimateNumber} — {input.estimateDate} (valid until {input.validUntil})
        </Text>

        <View style={styles.row}>
          <Text style={styles.label}>Client</Text>
          <Text style={styles.value}>{input.clientName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Site Address</Text>
          <Text style={styles.value}>{input.siteAddress || "—"}</Text>
        </View>
        {input.phone && (
          <View style={styles.row}>
            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>{input.phone}</Text>
          </View>
        )}
        {input.email && (
          <View style={styles.row}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{input.email}</Text>
          </View>
        )}

        <Text style={styles.section}>Scope of Work</Text>
        {input.scope.map((s, i) => (
          <Text key={i} style={styles.scopeItem}>
            •  {s}
          </Text>
        ))}

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Estimated Total</Text>
          <Text style={styles.totalValue}>{input.total}</Text>
          <Text style={styles.gstBasis}>{input.gstBasis}</Text>
        </View>

        {input.assumptions && input.assumptions.length > 0 && (
          <>
            <Text style={styles.section}>Assumptions</Text>
            {input.assumptions.map((a, i) => (
              <Text key={i} style={styles.scopeItem}>
                •  {a}
              </Text>
            ))}
          </>
        )}

        <Text style={styles.footer}>
          This is a sales-stage estimate, not a formal quotation. Please let us know if you would like us to prepare
          a formal quotation.
        </Text>
      </Page>
    </Document>
  );
}

export async function generateEstimatePdf(input: EstimatePdfInput): Promise<Buffer> {
  return renderToBuffer(EstimateDocument(input));
}
