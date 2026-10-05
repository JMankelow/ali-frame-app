// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import "server-only";
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { readFileSync } from "fs";
import path from "path";

// One house style for every PDF the app produces (quotes, repricing, safety documents, reviews):
// AliFrame letterhead on a white page, cyan headings, charcoal text, page numbers and company footer.
// Documents are always built as real PDF pages here — never a print of a web page.
export const BRAND = { blue: "#009FE3", ink: "#33383D", grey: "#6B7175", light: "#F2F5F6", rule: "#D8E0E3", red: "#C8102E" };

export const pdf = StyleSheet.create({
  page: { paddingHorizontal: 51, paddingTop: 37, paddingBottom: 64, fontSize: 9.5, fontFamily: "Helvetica", color: BRAND.ink },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1.5, borderBottomColor: BRAND.blue, paddingBottom: 8 },
  logo: { width: 150, height: 44 },
  title: { fontSize: 20, lineHeight: 1.15, fontFamily: "Helvetica-Bold", color: BRAND.ink, textAlign: "right" },
  titleSub: { fontSize: 9, color: BRAND.grey, textAlign: "right", marginTop: 4 },
  panel: { backgroundColor: BRAND.light, borderWidth: 0.5, borderColor: BRAND.rule, padding: 8, marginTop: 14, flexDirection: "row" },
  panelCol: { flex: 1 },
  label: { fontSize: 7.8, fontFamily: "Helvetica-Bold", color: BRAND.blue, marginBottom: 2, textTransform: "uppercase" },
  small: { fontSize: 8, color: BRAND.grey },
  h2: { fontSize: 11.5, fontFamily: "Helvetica-Bold", color: BRAND.blue, marginTop: 14, marginBottom: 5 },
  p: { marginBottom: 4, fontSize: 9.5, lineHeight: 1.3 },
  bullet: { flexDirection: "row", marginBottom: 1 },
  bulletDot: { width: 12 },
  th: { flexDirection: "row", backgroundColor: BRAND.blue, paddingVertical: 4, paddingHorizontal: 6 },
  thText: { color: "#FFFFFF", fontFamily: "Helvetica-Bold", fontSize: 8.5 },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: BRAND.rule, paddingVertical: 5, paddingHorizontal: 6 },
  totalBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: BRAND.blue, paddingHorizontal: 9, paddingVertical: 9, marginTop: 10 },
  totalLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },
  totalValue: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },
  footer: { position: "absolute", left: 51, right: 51, bottom: 26, borderTopWidth: 0.5, borderTopColor: BRAND.rule, paddingTop: 6, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: BRAND.grey },
});

export function logoData(): Buffer {
  return readFileSync(path.join(process.cwd(), "public", "aliframe-estimate-logo.png"));
}

export function Header({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={pdf.header}>
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image src={{ data: logoData(), format: "png" }} style={pdf.logo} />
      <View>
        <Text style={pdf.title}>{title}</Text>
        {sub ? <Text style={pdf.titleSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

/** Company footer with page numbers — fixed so it repeats on every page. */
export function Footer() {
  return (
    <View style={pdf.footer} fixed>
      <Text>BLB Consultants Limited T/A Ali-Frame Windows &amp; Doors  |  0800 ALI FRAME  |  aliframe.co.nz</Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}

export function Bullet({ children }: { children: ReactNode }) {
  return (
    <View style={pdf.bullet} wrap={false}>
      <Text style={pdf.bulletDot}>•</Text>
      <Text style={{ flex: 1, fontSize: 9.5, lineHeight: 1.3 }}>{children}</Text>
    </View>
  );
}

export function Doc({ title, children }: { title: string; children: ReactNode }) {
  return <Document title={title} author="Ali-Frame Windows & Doors" creator="Ali-Frame Job Management">{children}</Document>;
}

export { Page, Text, View, renderToBuffer };

// ---------- shared building blocks ----------

export type PCell = string | number | null | undefined | { t: string | number; bg?: string; bold?: boolean; color?: string };
export interface PCol {
  label: string;
  /** Relative width (flex); default 1. */
  w?: number;
  align?: "left" | "right" | "center";
}

const cellText = (c: PCell) => (c == null ? "" : typeof c === "object" ? String(c.t) : String(c));

/** A bordered table with a coloured header row. Rows never split across pages. */
export function PTable({ cols, rows, size = 8.5 }: { cols: PCol[]; rows: PCell[][]; size?: number }) {
  return (
    <View style={{ marginBottom: 6 }}>
      <View style={pdf.th} wrap={false}>
        {cols.map((c, i) => (
          <Text key={i} style={[pdf.thText, { flex: c.w ?? 1, textAlign: c.align ?? "left", fontSize: size }]}>{c.label}</Text>
        ))}
      </View>
      {rows.map((r, ri) => (
        <View key={ri} style={[pdf.tr, { backgroundColor: ri % 2 ? "#FAFBFB" : "#FFFFFF" }]} wrap={false}>
          {cols.map((c, ci) => {
            const cell = r[ci];
            const o = cell != null && typeof cell === "object" ? cell : null;
            return (
              <View key={ci} style={{ flex: c.w ?? 1, paddingRight: 4, ...(o?.bg ? { backgroundColor: o.bg, marginVertical: -5, paddingVertical: 5, paddingLeft: 3 } : {}) }}>
                <Text style={{ textAlign: c.align ?? "left", fontSize: size, lineHeight: 1.25, ...(o?.bold ? { fontFamily: "Helvetica-Bold" } : {}), ...(o?.color ? { color: o.color } : {}) }}>
                  {cellText(cell)}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** Two-column "label | value" table (details panels). */
export function KV({ rows, labelW = 1 }: { rows: [string, string | number | null | undefined][]; labelW?: number }) {
  return (
    <View style={{ marginBottom: 6, borderWidth: 0.5, borderColor: BRAND.rule }}>
      {rows.map(([k, v], i) => (
        <View key={i} style={{ flexDirection: "row", borderBottomWidth: i === rows.length - 1 ? 0 : 0.5, borderBottomColor: BRAND.rule }} wrap={false}>
          <Text style={{ flex: labelW, backgroundColor: BRAND.light, fontFamily: "Helvetica-Bold", padding: 5, fontSize: 8.5, color: BRAND.ink }}>{k}</Text>
          <Text style={{ flex: 2.2, padding: 5, fontSize: 8.5, lineHeight: 1.3 }}>{v == null || v === "" ? "—" : String(v)}</Text>
        </View>
      ))}
    </View>
  );
}

/** Renders the light markup used by company H&S documents: "## " heading, "- " bullet, "| a | b |" table row. */
export function Markup({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
    } else if (line.startsWith("## ")) {
      out.push(<Text key={key++} style={[pdf.h2, { fontSize: 10.5, marginTop: 10 }]} minPresenceAhead={50}>{line.slice(3)}</Text>);
      i++;
    } else if (line.startsWith("- ")) {
      while (i < lines.length && lines[i].startsWith("- ")) out.push(<Bullet key={key++}>{lines[i++].slice(2)}</Bullet>);
    } else if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++].split("|").slice(1, -1).map((c) => c.trim()));
      const [head, ...body] = rows;
      out.push(<PTable key={key++} cols={head.map((h) => ({ label: h }))} rows={body} />);
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i].trim() && !lines[i].startsWith("## ") && !lines[i].startsWith("- ") && !lines[i].startsWith("|")) para.push(lines[i++]);
      out.push(<Text key={key++} style={pdf.p}>{para.join("\n")}</Text>);
    }
  }
  return <View>{out}</View>;
}

/** A signature line with a caption, e.g. "Signed (name)". */
export function SignLine({ caption, value }: { caption: string; value?: string | null }) {
  return (
    <View style={{ flex: 1, marginRight: 14 }} wrap={false}>
      <Text style={{ minHeight: 16, fontSize: 9.5, paddingBottom: 2 }}>{value ?? ""}</Text>
      <View style={{ borderTopWidth: 0.75, borderTopColor: BRAND.ink, paddingTop: 3 }}>
        <Text style={pdf.small}>{caption}</Text>
      </View>
    </View>
  );
}
