// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import "server-only";
import { Doc, Footer, Header, KV, Markup, Page, PTable, SignLine, Text, View, pdf, renderToBuffer } from "@/lib/pdfKit";

const fmt = (d: Date | null | undefined) => (d ? d.toLocaleDateString("en-NZ") : "");

// ---------- one company document ----------

export interface HsDocPdfInput {
  title: string;
  version: string | null;
  status: string;
  effectiveDate: Date | null;
  nextReviewDate: Date | null;
  content: string;
}

export async function generateHsDocumentPdf(d: HsDocPdfInput): Promise<Buffer> {
  return renderToBuffer(
    <Doc title={d.title}>
      <Page size="A4" style={pdf.page}>
        <Header title={d.title.toUpperCase().length > 28 ? "HEALTH & SAFETY" : d.title.toUpperCase()} sub={d.version ?? undefined} />
        <View style={pdf.panel}>
          <View style={pdf.panelCol}>
            <Text style={pdf.label}>Document</Text>
            <Text>{d.title}</Text>
            {d.version ? <Text>Version: {d.version}</Text> : null}
          </View>
          <View style={pdf.panelCol}>
            <Text style={pdf.label}>Status</Text>
            <Text>{d.status}</Text>
            {d.effectiveDate ? <Text>Effective: {fmt(d.effectiveDate)}</Text> : null}
            {d.nextReviewDate ? <Text>Next review: {fmt(d.nextReviewDate)}</Text> : null}
          </View>
        </View>
        <Text style={[pdf.h2, { marginTop: 16 }]}>{d.title}</Text>
        <Markup content={d.content} />
        <Footer />
      </Page>
    </Doc>,
  );
}

// ---------- the full Site Specific Safety Plan pack ----------

export interface SsspPdfInput {
  job: { number: string; title: string; address: string | null; clientName: string | null };
  sssp: {
    siteAddress: string | null;
    siteActivities: string | null;
    mainContractor: string | null;
    pcbu1ProjectManager: string | null;
    pcbu1SiteManager: string | null;
    pcbu1HsRep: string | null;
    pcbu2ProjectManager: string | null;
    pcbu2SiteManager: string | null;
    pcbu2HsRep: string | null;
    pcbu1SignedBy: string | null;
    pcbu1SignedAt: Date | null;
    pcbu2SignedBy: string | null;
    pcbu2SignedAt: Date | null;
    approvedToStartBy: string | null;
    approvedToStartAt: Date | null;
    siteNotes: string | null;
    updatedAt: Date;
    signOns: { name: string; company: string | null; inductionDate: Date | null; createdAt: Date }[];
  } | null;
  defaults: { siteActivities: string; pcbu2ProjectManager: string; pcbu2SiteManager: string; pcbu2HsRep: string };
  docs: { slug: string; title: string; content: string }[];
  risks: { activity: string; hazard: string; potentialHarm: string | null; initialRisk: string; controls: string; residualRisk: string }[];
  people: { name: string; keyRole: string | null; siteSafeNumber: string | null; qualifications: string | null; yearsExperience: string | number | null }[];
}

const RISK_BG: Record<string, string> = { Low: "#DCFCE7", Medium: "#FEF3C7", High: "#FEE2E2", Extreme: "#FECACA" };
const riskCell = (v: string) => ({ t: v, bg: RISK_BG[v] ?? undefined, bold: true });

export async function generateSsspPdf(i: SsspPdfInput): Promise<Buffer> {
  const s = i.sssp;
  const v = {
    siteAddress: s?.siteAddress ?? i.job.address ?? "",
    siteActivities: s?.siteActivities ?? i.defaults.siteActivities,
    pcbu2ProjectManager: s?.pcbu2ProjectManager ?? i.defaults.pcbu2ProjectManager,
    pcbu2SiteManager: s?.pcbu2SiteManager ?? i.defaults.pcbu2SiteManager,
    pcbu2HsRep: s?.pcbu2HsRep ?? i.defaults.pcbu2HsRep,
  };
  const doc = (slug: string) => i.docs.find((d) => d.slug === slug);
  const docPage = (slug: string) => {
    const d = doc(slug);
    return d ? (
      <Page key={slug} size="A4" style={pdf.page}>
        <Header title="SITE SAFETY PLAN" sub={`Job ${i.job.number}`} />
        <Text style={[pdf.h2, { marginTop: 14 }]}>{d.title}</Text>
        <Markup content={d.content} />
        <Footer />
      </Page>
    ) : null;
  };
  const blankRows = Math.max(0, 12 - (s?.signOns.length ?? 0));

  return renderToBuffer(
    <Doc title={`Site Specific Safety Plan — job ${i.job.number}`}>
      {/* cover */}
      <Page size="A4" style={pdf.page}>
        <Header title="SITE SPECIFIC SAFETY PLAN" sub={`Job ${i.job.number}`} />
        <View style={{ marginTop: 90 }}>
          <Text style={{ fontSize: 26, fontFamily: "Helvetica-Bold", color: "#009FE3", lineHeight: 1.2 }}>Site Specific Safety Plan</Text>
          <Text style={{ fontSize: 13, marginTop: 14 }}>{v.siteAddress || "Site address to be confirmed"}</Text>
          <Text style={{ fontSize: 11, marginTop: 4, color: "#6B7175" }}>
            {i.job.clientName ?? i.job.title} · Job {i.job.number} · {fmt(s?.updatedAt ?? new Date())}
          </Text>
          <Text style={{ fontSize: 10, marginTop: 30, color: "#6B7175" }}>Ali-Frame Windows &amp; Doors · 0800 254 372 · sales@aliframe.co.nz · www.aliframe.co.nz</Text>
        </View>
        <Footer />
      </Page>

      {docPage("policy")}

      <Page size="A4" style={pdf.page}>
        <Header title="SITE SAFETY PLAN" sub={`Job ${i.job.number}`} />
        <Text style={[pdf.h2, { marginTop: 14 }]}>Site Specific Health and Safety Agreement</Text>
        <KV
          labelW={1.1}
          rows={[
            ["The site this agreement relates to", v.siteAddress],
            ["Site activities this agreement covers", v.siteActivities],
            [
              "Main Contractor (PCBU 1)",
              `${s?.mainContractor || "—"}\nProject Manager: ${s?.pcbu1ProjectManager || "________"}\nSite Manager: ${s?.pcbu1SiteManager || "________"}\nH&S Representative: ${s?.pcbu1HsRep || "________"}`,
            ],
            ["PCBU 2", `Ali Frame Windows & Doors\nProject Manager: ${v.pcbu2ProjectManager}\nSite Manager: ${v.pcbu2SiteManager}\nH&S Representative: ${v.pcbu2HsRep}\nType of business: Contractor`],
            ...(s?.siteNotes ? ([["Site-specific notes", s.siteNotes]] as [string, string][]) : []),
          ]}
        />
        <Footer />
      </Page>

      {docPage("incident-procedure")}

      <Page size="A4" style={pdf.page}>
        <Header title="SITE SAFETY PLAN" sub={`Job ${i.job.number}`} />
        <Text style={[pdf.h2, { marginTop: 14 }]}>Declaration</Text>

        <Text style={{ fontFamily: "Helvetica-Bold", marginTop: 6 }}>PCBU 1 (Principal / Main Contractor)</Text>
        <Text style={pdf.p}>We have read the site-specific safety plan information provided by Ali-Frame Windows &amp; Doors and agree that it is the appropriate approach to health and safety on this site for the duration of the contract.</Text>
        <View style={{ flexDirection: "row", marginTop: 8 }}>
          <SignLine caption="Signed" value={s?.pcbu1SignedBy} />
          <SignLine caption="Date" value={fmt(s?.pcbu1SignedAt)} />
        </View>

        <Text style={{ fontFamily: "Helvetica-Bold", marginTop: 18 }}>PCBU 2 (Ali Frame)</Text>
        <Text style={pdf.p}>We agree to act according to the content of the site-specific safety plan as outlined above.</Text>
        <View style={{ flexDirection: "row", marginTop: 8 }}>
          <SignLine caption="Signed" value={s?.pcbu2SignedBy} />
          <SignLine caption="Date" value={fmt(s?.pcbu2SignedAt)} />
        </View>

        <Text style={{ fontFamily: "Helvetica-Bold", marginTop: 18 }}>Approval to start work</Text>
        <Text style={pdf.p}>To be signed by a representative of PCBU 1 when all required pre-start documentation has been provided and approved.</Text>
        <View style={{ flexDirection: "row", marginTop: 8 }}>
          <SignLine caption="Signed" value={s?.approvedToStartBy} />
          <SignLine caption="Date" value={fmt(s?.approvedToStartAt)} />
        </View>
        <Footer />
      </Page>

      <Page size="A4" style={pdf.page}>
        <Header title="SITE SAFETY PLAN" sub={`Job ${i.job.number}`} />
        <Text style={[pdf.h2, { marginTop: 14 }]}>Worker Sign-On &amp; Site Acknowledgement</Text>
        <Text style={pdf.p}>
          Before starting work on this site, each worker must confirm that they have read and understood this Site Specific Safety Plan, received a site induction, and agree to comply with its requirements and with all Main Contractor site rules. This register is completed by each worker prior to starting work and is retained on site for the duration of the project.
        </Text>
        <PTable
          cols={[{ label: "Name", w: 2 }, { label: "Company / Employer", w: 2 }, { label: "Site induction completed", w: 1.4 }, { label: "Signature", w: 1.6 }, { label: "Date", w: 1 }]}
          rows={[
            ...(s?.signOns ?? []).map((o) => [o.name, o.company ?? "", fmt(o.inductionDate), "Acknowledged in app", fmt(o.createdAt)]),
            ...Array.from({ length: blankRows }, () => ["", "", "", "", ""]),
          ]}
        />
        <Footer />
      </Page>

      {docPage("hazard-risk-procedure")}

      <Page size="A4" orientation="landscape" style={{ ...pdf.page, paddingHorizontal: 40 }}>
        <Header title="SITE SAFETY PLAN" sub={`Job ${i.job.number}`} />
        <Text style={[pdf.h2, { marginTop: 14 }]}>Company Hazard and Risk Register</Text>
        <PTable
          size={8}
          cols={[{ label: "Task / Activity", w: 1.3 }, { label: "Hazard", w: 1.5 }, { label: "Potential harm", w: 1.2 }, { label: "Initial risk", w: 0.8, align: "center" }, { label: "Control measures", w: 3 }, { label: "Residual risk", w: 0.8, align: "center" }]}
          rows={i.risks.map((r) => [r.activity, r.hazard, r.potentialHarm ?? "", riskCell(r.initialRisk), r.controls, riskCell(r.residualRisk)])}
        />
        <Footer />
      </Page>

      {docPage("ppe")}
      {docPage("hazardous-substances")}
      {docPage("emergency-response")}

      <Page size="A4" style={pdf.page}>
        <Header title="SITE SAFETY PLAN" sub={`Job ${i.job.number}`} />
        <Text style={[pdf.h2, { marginTop: 14 }]}>Training &amp; Qualifications Register</Text>
        <Text style={pdf.p}>Ali-Frame maintains a register of worker competencies, licences and trade qualifications relevant to the scope of work carried out on client sites.</Text>
        <PTable
          cols={[{ label: "Name", w: 1.6 }, { label: "Key role", w: 1.3 }, { label: "Training, licences & formal qualifications", w: 3 }, { label: "Years", w: 0.6, align: "center" }]}
          rows={i.people.map((p) => [p.name, p.keyRole ?? "", [p.siteSafeNumber ? `No. ${p.siteSafeNumber}` : "", p.qualifications ?? ""].filter(Boolean).join(" — "), p.yearsExperience ?? ""])}
        />
        <Text style={[pdf.small, { marginTop: 10 }]}>© 2026 BLB Consultants Limited T/A Ali-Frame Windows &amp; Doors — Confidential</Text>
        <Footer />
      </Page>
    </Doc>,
  );
}
