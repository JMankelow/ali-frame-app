// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.

// Ali-Frame Competency and KPI 360 Review — content from the two approved templates
// ("Installer Review Assessment" and "Senior Installer Review Assessment", 24.04.2026 V1).
// Pay bands and levels are guidance for the manager; any pay change still needs formal approval and a written variation.

export interface ReviewItem {
  key: string;
  competency: string;
  expectation: string;
}
export interface ReviewSection {
  key: string;
  title: string;
  items: ReviewItem[];
}
export interface FrameworkRow {
  classification: string;
  level: string;
  payBand: string;
  focus: string;
  timeframe: string;
}
export interface LevelRule {
  label: string; // e.g. "Senior – Level 3"
  minAvg: number; // lowest manager average that supports this level
}
export interface PayRule {
  from: number; // inclusive lower bound of the average
  band: string;
}
export interface ReviewTemplateDef {
  key: string;
  name: string; // "Installer" | "Senior Installer"
  title: string; // document title
  subtitle: string;
  sections: ReviewSection[];
  framework: FrameworkRow[];
  levels: LevelRule[];
  payRules: PayRule[];
  benefits: { name: string; value: string }[];
}

export const RATING_SCALE = [
  { value: "1", name: "1 – Not yet competent", text: "Does not meet expectations" },
  { value: "2", name: "2 – Developing", text: "Needs guidance and support" },
  { value: "3", name: "3 – Competent", text: "Works independently" },
  { value: "4", name: "4 – Advanced", text: "Exceeds expectations" },
  { value: "5", name: "5 – Expert / leader", text: "Leads and trains others" },
  { value: "NO", name: "N/O – Not observed", text: "Insufficient evidence; excluded from totals and averages" },
];

export const ASSESSMENT_RULE =
  "Assessment rule: A numerical average alone does not determine progression. Health & safety practice, installation quality, QA and honest reporting are essential. A level should be recommended only where the employee has reliable evidence and is rated at least 3 (competent) for the applicable requirements of that level and every earlier level.";

export const PURPOSE_TEXT =
  "This assessment measures performance against the Ali-Frame installer competency framework. It is used to confirm current competence, identify development needs and support a recommendation about role level. The employee completes a self assessment; the manager completes the manager assessment and records the outcome. Ratings of N/O or left blank are excluded from totals and averages.";

const SECTIONS: ReviewSection[] = [
  {
    key: "core",
    title: "Core Installation Competency",
    items: [
      { key: "core_quality", competency: "Installation Quality", expectation: "Consistently installs joinery to required standard with minimal defects" },
      { key: "core_problem", competency: "Problem Solving", expectation: "Identifies issues early and implements practical solutions" },
      { key: "core_product", competency: "Product Knowledge", expectation: "Understands joinery, glazing, and systems" },
      { key: "core_weather", competency: "Weatherproofing", expectation: "Applies correct sealing, flashing and moisture control" },
      { key: "core_tools", competency: "Tools & Equipment", expectation: "Using tools safely and efficiently" },
    ],
  },
  {
    key: "hs",
    title: "Health & Safety and Compliance",
    items: [
      { key: "hs_practice", competency: "Health & Safety Practices", expectation: "Works safely and follows H&S policies" },
      { key: "hs_hazard", competency: "Hazard Identification", expectation: "Identifies hazards and manages risks" },
      { key: "hs_ppe", competency: "PPE & Equipment", expectation: "Uses PPE correctly" },
      { key: "hs_site", competency: "Site Safety", expectation: "Maintains safe worksite" },
      { key: "hs_compliance", competency: "Compliance", expectation: "Meets Site Safe requirements" },
    ],
  },
  {
    key: "residential",
    title: "Residential Competency",
    items: [
      { key: "res_site", competency: "Site Management", expectation: "Manages site independently" },
      { key: "res_deliveries", competency: "Deliveries", expectation: "Manages deliveries and communicates issues" },
      { key: "res_measuring", competency: "Measuring", expectation: "Accurately measures flashings and trims" },
      { key: "res_team", competency: "Team Management", expectation: "Leads team onsite" },
      { key: "res_client", competency: "Client Communication", expectation: "Communicates professionally" },
    ],
  },
  {
    key: "commercial",
    title: "Commercial Competency",
    items: [
      { key: "com_expect", competency: "Commercial Expectations", expectation: "Understands commercial requirements" },
      { key: "com_plans", competency: "Plans & Documentation", expectation: "Reads and interprets plans" },
      { key: "com_deliveries", competency: "Deliveries & Coordination", expectation: "Manages deliveries" },
      { key: "com_leadership", competency: "Team Leadership", expectation: "Leads team effectively" },
      { key: "com_comms", competency: "Communication", expectation: "Communicates with PMs and foreman" },
    ],
  },
  {
    key: "leadership",
    title: "Leadership and Development",
    items: [
      { key: "lead_lead", competency: "Leadership", expectation: "Leads by example" },
      { key: "lead_coach", competency: "Coaching", expectation: "Coaches team" },
      { key: "lead_train", competency: "Training", expectation: "Trains junior installers" },
      { key: "lead_apprentice", competency: "Apprenticeships", expectation: "Supervises apprentices" },
      { key: "lead_mentor", competency: "Mentoring", expectation: "Mentors staff" },
    ],
  },
  {
    key: "admin",
    title: "Administration and Job Requirements",
    items: [
      { key: "adm_qa", competency: "QA Documentation", expectation: "Completes QA correctly" },
      { key: "adm_photos", competency: "Photos", expectation: "Takes before and after photos" },
      { key: "adm_timesheets", competency: "Timesheets", expectation: "Completes timesheets daily" },
      { key: "adm_hsreport", competency: "H&S Reporting", expectation: "Logs hazards daily" },
      { key: "adm_vehicle", competency: "Vehicle Checklist", expectation: "Completes monthly checks" },
      { key: "adm_budget", competency: "Budget & Profitability", expectation: "Stays within job budget" },
    ],
  },
];

const BENEFITS = [
  { name: "Company Phone", value: "$800–$1,200 per annum" },
  { name: "Company Car", value: "$10–15K depending on usage" },
  { name: "Health Insurance", value: "$1,700–$2,000 depending on age" },
  { name: "Professional Development (Site Safe / App)", value: "Variable based on learning requirements" },
  { name: "Discretionary Bonus", value: "Variable, dependent on profits" },
];

export const REVIEW_TEMPLATES: ReviewTemplateDef[] = [
  {
    key: "installer",
    name: "Installer",
    title: "Installer Competency Assessment (360 Review)",
    subtitle: "Junior | Intermediate | Senior | Senior / Lead",
    sections: SECTIONS,
    framework: [
      { classification: "Junior", level: "1", payBand: "$24–$25 (avg 1) · $26 (avg 1.5)", focus: "Assists installs, learns tools and processes, follows instructions. Not yet expected to work independently or complete QA / documentation.", timeframe: "0–2 years" },
      { classification: "Intermediate", level: "2", payBand: "$27 (avg 2) · $28–$29 (avg 2.5)", focus: "Completes basic installs, some independence, reads simple plans, schedules. Developing speed, consistency and confidence.", timeframe: "2–4 years" },
      { classification: "Senior", level: "3", payBand: "$30–$33 (avg 3.0)", focus: "Fully competent installer, works independently, handles standard jobs. Delivers quality work, minimises rework, completes basic QA.", timeframe: "4–6 years" },
      { classification: "Senior", level: "4", payBand: "$33–$37 (avg 3.5)", focus: "Handles complex installs, problem solving on site, supports junior staff. Efficient and reliable, leads small jobs, consistent QA and communication.", timeframe: "6–8 years" },
      { classification: "Senior", level: "5", payBand: "$37–$39 (avg 4.0)", focus: "Leads jobs and teams, client and builder communication, strong problem solving. Full job ownership; QA, photos and H&S completed consistently; minimal defects and callbacks.", timeframe: "8+ years" },
      { classification: "Senior / Lead", level: "6", payBand: "$40–$45 (avg 5.0)", focus: "Manages teams and workflows, coordinates with project managers, oversees commercial sites. Team productivity, QA and H&S compliance across jobs, site leadership and planning.", timeframe: "Lead installer / foreman" },
    ],
    levels: [
      { label: "Junior – Level 1", minAvg: 0 },
      { label: "Intermediate – Level 2", minAvg: 2 },
      { label: "Senior – Level 3", minAvg: 3 },
      { label: "Senior – Level 4", minAvg: 3.5 },
      { label: "Senior – Level 5", minAvg: 4 },
      { label: "Senior / Lead – Level 6", minAvg: 5 },
    ],
    payRules: [
      { from: 0, band: "$24–$25" },
      { from: 1.5, band: "$26" },
      { from: 2, band: "$27" },
      { from: 2.5, band: "$28–$29" },
      { from: 3, band: "$30–$33" },
      { from: 3.5, band: "$33–$37" },
      { from: 4, band: "$37–$39" },
      { from: 5, band: "$40–$45" },
    ],
    benefits: BENEFITS,
  },
  {
    key: "senior-installer",
    name: "Senior Installer",
    title: "Senior Installer Competency Assessment (360 Review)",
    subtitle: "Senior Level 1 | 2 | 3 | 4 | 5",
    sections: SECTIONS,
    framework: [
      { classification: "Senior", level: "1", payBand: "$30–$33", focus: "Meets all basic requirements to the expected standard.", timeframe: "Minimum average 3.0" },
      { classification: "Senior", level: "2", payBand: "$31–$33", focus: "Leads and manages a team, ensures work meets required standards, takes full ownership of the site, and communicates clearly with clients and management.", timeframe: "Minimum average 3.2" },
      { classification: "Senior", level: "3", payBand: "$34–$36", focus: "Trains, supports and supervises team members to deliver work to the required standard.", timeframe: "Minimum average 3.5" },
      { classification: "Senior", level: "4", payBand: "$37–$38", focus: "Leads commercial sites, taking responsibility for delivering QA and Health & Safety to the required standard.", timeframe: "Minimum average 3.6–3.8" },
      { classification: "Senior", level: "5", payBand: "$40–$45", focus: "Takes full responsibility for completing all administration to a high standard.", timeframe: "Minimum average 4.2+" },
    ],
    levels: [
      { label: "Senior – Level 1", minAvg: 0 },
      { label: "Senior – Level 2", minAvg: 3.2 },
      { label: "Senior – Level 3", minAvg: 3.5 },
      { label: "Senior – Level 4", minAvg: 3.6 },
      { label: "Senior – Level 5", minAvg: 4.2 },
    ],
    payRules: [
      { from: 0, band: "$30" },
      { from: 2, band: "$31–$33" },
      { from: 3, band: "$34–$36" },
      { from: 4, band: "$37–$38" },
      { from: 5, band: "$40–$45" },
    ],
    benefits: BENEFITS,
  },
];

export function getReviewTemplate(key: string): ReviewTemplateDef | undefined {
  return REVIEW_TEMPLATES.find((t) => t.key === key);
}

/** The employee's Development & Feedback questions (from the Installer Development & Feedback Form). Answered in the self assessment. */
export const FEEDBACK_QUESTIONS: { group: string; qs: { key: string; q: string }[] }[] = [
  {
    group: "Development & training",
    qs: [
      { key: "fb1", q: "What parts of your job would you like to get better at?" },
      { key: "fb2", q: "Is there anything you would like more training or experience in?" },
      { key: "fb3", q: "What do you think would help you improve in your role?" },
    ],
  },
  {
    group: "Support, tools & resources",
    qs: [
      { key: "fb4", q: "Is there anything we could provide or do differently to help you do your job better?" },
      { key: "fb5", q: "Are there any tools, equipment, materials or information that would make your job easier?" },
      { key: "fb6", q: "What would you like to achieve or learn over the next 6–12 months?" },
    ],
  },
  {
    group: "Role experience & feedback",
    qs: [
      { key: "fb7", q: "What do you enjoy most about your job?" },
      { key: "fb8", q: "Is there anything you think we could do better for our installers?" },
      { key: "fb9", q: "Is there anything else you would like to tell us?" },
    ],
  },
];

export const QUALIFICATION_ROWS: { key: string; requirement: string; statusHint: string }[] = [
  { key: "sitesafe", requirement: "Site Safe (current)", statusHint: "Current / Due / N/A" },
  { key: "height", requirement: "Working at height / EWP", statusHint: "Current / Due / N/A" },
  { key: "firstaid", requirement: "First aid", statusHint: "Current / Due / N/A" },
  { key: "trade", requirement: "Trade qualification (NZQA / BCITO)", statusHint: "Completed / In progress / N/A" },
  { key: "licence", requirement: "Full NZ driver licence", statusHint: "Current / Due / N/A" },
  { key: "induction", requirement: "Company H&S induction", statusHint: "Current / Due / N/A" },
  { key: "scope", requirement: "Authority limits and job scope confirmed", statusHint: "Yes / No" },
];

export const FEEDBACK_SOURCES = [
  { key: "peer", label: "Peer / team" },
  { key: "direct", label: "Direct report / apprentice (if applicable)" },
  { key: "client", label: "Client / builder feedback (optional)" },
];

export const DECISION_OPTIONS = ["Confirmed", "Development period required", "No change", "Other"];

// ---------------- scoring ----------------

export type Ratings = Record<string, { r: number | null; c?: string; na?: boolean }>;

export interface SectionScore {
  key: string;
  title: string;
  rated: number;
  total: number;
  average: number | null;
  percent: number | null;
}
export interface Score {
  sections: SectionScore[];
  rated: number;
  total: number;
  average: number | null;
  percent: number | null;
  atLeastThree: number;
}

/** Totals and averages exclude items that are N/O or blank. */
export function scoreRatings(tpl: ReviewTemplateDef, ratings: Ratings): Score {
  let rated = 0;
  let total = 0;
  let atLeastThree = 0;
  const sections = tpl.sections.map((s) => {
    let r = 0;
    let t = 0;
    for (const item of s.items) {
      const v = ratings[item.key]?.r;
      if (typeof v === "number" && v >= 1 && v <= 5) {
        r += 1;
        t += v;
        if (v >= 3) atLeastThree += 1;
      }
    }
    rated += r;
    total += t;
    return { key: s.key, title: s.title, rated: r, total: t, average: r ? t / r : null, percent: r ? (t / (r * 5)) * 100 : null };
  });
  return { sections, rated, total, average: rated ? total / rated : null, percent: rated ? (total / (rated * 5)) * 100 : null, atLeastThree };
}

export function recommendLevel(tpl: ReviewTemplateDef, average: number | null): string {
  if (average == null) return "";
  let label = tpl.levels[0].label;
  for (const l of tpl.levels) if (average >= l.minAvg) label = l.label;
  return label;
}
export function recommendPayBand(tpl: ReviewTemplateDef, average: number | null): string {
  if (average == null) return "";
  let band = tpl.payRules[0].band;
  for (const p of tpl.payRules) if (average >= p.from) band = p.band;
  return band;
}

export const fmt1 = (n: number | null, d = 2) => (n == null ? "—" : n.toFixed(d));

export interface OutcomeData {
  currentLevel?: string;
  recommendedLevel?: string;
  payBand?: string;
  placement?: string;
  gaps?: string;
  evidenceNeeded?: string;
  scope?: string;
  decision?: string;
  nextReview?: string;
  timeframe?: string;
  notes?: string;
  strengths?: string;
  priorities?: string;
  benefits?: Record<string, string>;
  plan?: { priority: string; action: string; owner: string; target: string; evidence: string }[];
}
