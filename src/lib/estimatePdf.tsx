// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import "server-only";
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import path from "path";
import { readFileSync } from "fs";

// Follows Jo's "Sales - AliFrame Estimate" skill: one A4 page, AliFrame logo, ONE total price only
// (no line items / subtotals / GST amount / deposit), a short scope, the fixed estimate notes, and the
// exact closing sentence inviting a formal quotation.
const BLUE = "#009FE3";
const CHARCOAL = "#33383D";
const MID_GREY = "#6B7175";
const LIGHT_GREY = "#F2F5F6";

const s = StyleSheet.create({
  page: { paddingHorizontal: 51, paddingVertical: 37, fontSize: 9.2, fontFamily: "Helvetica", color: CHARCOAL, lineHeight: 1.3 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1.5, borderBottomColor: BLUE, paddingBottom: 8 },
  logo: { width: 181, height: 53 },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", color: CHARCOAL },
  details: { flexDirection: "row", marginTop: 17, backgroundColor: LIGHT_GREY, borderWidth: 0.5, borderColor: "#D8E0E3", padding: 8 },
  detailsLeft: { flex: 1.6 },
  detailsRight: { flex: 1 },
  label: { fontSize: 7.8, fontFamily: "Helvetica-Bold", color: BLUE, marginBottom: 2 },
  small: { fontSize: 7.8, color: MID_GREY },
  heading: { fontSize: 11, fontFamily: "Helvetica-Bold", color: BLUE, marginTop: 14, marginBottom: 5 },
  bullet: { flexDirection: "row", marginBottom: 4 },
  dot: { width: 12 },
  price: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: BLUE, paddingHorizontal: 9, paddingVertical: 9, marginTop: 9 },
  priceLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },
  priceValue: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },
  priceBasis: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },
  note: { flexDirection: "row", marginBottom: 3 },
  noteText: { width: 12, fontSize: 7.8, color: MID_GREY },
  noteBody: { flex: 1, fontSize: 7.8, color: MID_GREY },
  cta: { marginTop: 11, fontSize: 10.5, fontFamily: "Helvetica-Bold", color: BLUE },
  regards: { marginTop: 9 },
  business: { marginTop: 9, fontSize: 7.8, color: MID_GREY },
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
  /** The single price figure, e.g. "$6,400" — the GST basis is shown beside it, not inside it. */
  total: string;
  /** "plus GST" (default — historical install rates exclude GST) or "including GST". */
  gstBasis?: "plus GST" | "including GST";
  assumptions?: string[];
  preparedBy?: string;
}

const STANDARD_NOTES = [
  "This estimate is based on the information currently available and is subject to final site measure, specification confirmation and a formal written quotation.",
  "The estimate is valid for 30 days and may change if the scope, dimensions, access, materials or site conditions differ from the information supplied.",
  "Building consent, structural work, electrical work, painting and specialist access equipment are excluded unless specifically included in the proposed scope.",
  "AliFrame's full terms and payment conditions will be provided with the formal quotation.",
];

/** Turns "$5,100 + GST" / "5100 plus GST" into the bare figure and its GST basis. */
export function splitEstimateTotal(raw: string): { total: string; gstBasis: "plus GST" | "including GST" } {
  const t = raw.trim();
  const gstBasis = /incl/i.test(t) ? "including GST" : "plus GST";
  const figure = t.replace(/\s*(\+|plus|incl\.?(uding)?|inc\.?)\s*gst.*$/i, "").trim();
  const n = Number(figure.replace(/[$,\s]/g, ""));
  return { total: Number.isFinite(n) && figure !== "" ? `$${n.toLocaleString("en-NZ", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}` : figure, gstBasis };
}

function Bullet({ children, muted }: { children: string; muted?: boolean }) {
  return (
    <View style={muted ? s.note : s.bullet}>
      <Text style={muted ? s.noteText : s.dot}>•</Text>
      <Text style={muted ? s.noteBody : { flex: 1 }}>{children}</Text>
    </View>
  );
}

function EstimateDocument(input: EstimatePdfInput) {
  // Read the logo ourselves so rendering never depends on a file path/URL being fetched.
  const logo = readFileSync(path.join(process.cwd(), "public", "aliframe-estimate-logo.png"));
  const notes = [...STANDARD_NOTES, ...(input.assumptions ?? [])];

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={{ data: logo, format: "png" }} style={s.logo} />
          <Text style={s.title}>ESTIMATE</Text>
        </View>

        <View style={s.details}>
          <View style={s.detailsLeft}>
            <Text style={s.label}>PREPARED FOR</Text>
            <Text>{input.clientName}</Text>
            <Text>{input.siteAddress || "—"}</Text>
            {input.phone ? <Text style={s.small}>Phone: {input.phone}</Text> : null}
            {input.email ? <Text style={s.small}>Email: {input.email}</Text> : null}
          </View>
          <View style={s.detailsRight}>
            <Text style={s.label}>ESTIMATE DETAILS</Text>
            <Text>Estimate: {input.estimateNumber}</Text>
            <Text>Date: {input.estimateDate}</Text>
            <Text>Valid until: {input.validUntil}</Text>
          </View>
        </View>

        <Text style={s.heading}>Proposed scope</Text>
        {input.scope.map((item, i) => (
          <Bullet key={i}>{item}</Bullet>
        ))}

        <View style={s.price}>
          <Text style={s.priceLabel}>ESTIMATED TOTAL</Text>
          <Text>
            <Text style={s.priceValue}>{input.total}</Text>
            <Text style={s.priceBasis}> {input.gstBasis ?? "plus GST"}</Text>
          </Text>
        </View>

        <Text style={s.heading}>Estimate notes</Text>
        {notes.map((n, i) => (
          <Bullet key={i} muted>
            {n}
          </Bullet>
        ))}

        <Text style={s.cta}>Please let us know if you would like us to prepare a formal quotation.</Text>
        <View style={s.regards}>
          <Text>Kind regards,</Text>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>{input.preparedBy || "AliFrame Team"}</Text>
        </View>
        <Text style={s.business}>BLB Consultants Limited T/A Ali-Frame Windows &amp; Doors   |   0800 ALI FRAME   |   aliframe.co.nz</Text>
      </Page>
    </Document>
  );
}

export async function generateEstimatePdf(input: EstimatePdfInput): Promise<Buffer> {
  return renderToBuffer(EstimateDocument(input));
}
