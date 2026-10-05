// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.

// Employee document templates (Employee Documents tab). Wording follows Ali-Frame's own letters, with every
// person-specific fact replaced by a merge field. They are drafts: review each letter before it is issued,
// and take employment-law advice before relying on a disciplinary process.
//
// Body markup: "# " centred title, "## " sub-heading, "- " bullet, blank line = gap.
//   {{field}}            merge value        {{?field}}text   line only appears if the field has a value
//   [[signoff]]          "Kind regards" + signer block        [[ack]]  received-and-understood signature block
//   [[minutes-sign]]     manager + employee signature lines

export type FieldType = "text" | "textarea" | "date" | "shortdate" | "time" | "select";

export interface TemplateField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  options?: string[];
  default?: string;
}

export interface HrTemplate {
  key: string;
  name: string;
  docType: string; // category saved on the employee document
  description: string;
  /** Letters show the employee's address block under the date. */
  addressBlock: boolean;
  fields: TemplateField[];
  body: string;
}

const MEETING_PLACE = "34A Allens Road, East Tamaki";

export const HR_TEMPLATES: HrTemplate[] = [
  {
    key: "invitation-investigation",
    name: "Invitation to Investigative Meeting",
    docType: "Disciplinary",
    description: "Tells the employee about the concerns, the meeting, their right to a support person, and that no decision has been made.",
    addressBlock: true,
    fields: [
      { key: "concern", label: "What are the concerns / allegations?", type: "textarea", required: true, help: "Be specific: what, when, where. One paragraph per allegation." },
      { key: "evidence", label: "Information being considered (optional)", type: "textarea", help: "e.g. CCTV footage, photos, records, messages." },
      { key: "policyRefs", label: "Policy or agreement clauses relied on (optional)", type: "textarea" },
      { key: "meetingDate", label: "Meeting date", type: "date", required: true },
      { key: "meetingTime", label: "Meeting time", type: "time", required: true },
      { key: "meetingLocation", label: "Meeting location", type: "text", required: true, default: MEETING_PLACE },
      {
        key: "possibleOutcome",
        label: "Most serious outcome that could follow",
        type: "select",
        required: true,
        options: ["a verbal warning", "a formal written warning", "termination of your employment"],
        default: "a formal written warning",
      },
    ],
    body: `# INVITATION TO INVESTIGATIVE MEETING
Dear {{employeeFirstName}},
I am investigating concerns relating to your conduct. In particular, it has been brought to my attention that:
{{concern}}
{{?evidence}}The following information forms part of what is being considered: {{evidence}}
{{?policyRefs}}These concerns relate to: {{policyRefs}}
At this stage I have not formed a view about whether these concerns are true. Before I do, I would like to meet with you in an investigative meeting. The purpose of the meeting is to outline the concerns, give you the opportunity to respond and provide your version of events, and to gather relevant information.
Accordingly, you are required to attend a meeting at {{meetingTime}} on {{meetingDate}}, at {{meetingLocation}}.
You are entitled to bring a support person or representative with you to this meeting.
Please be aware that this matter is being treated seriously and that, depending on the outcome of the investigation, disciplinary action may follow, up to and including {{possibleOutcome}}. No decision will be made until I have considered everything you tell me.
Until the investigation is complete, please treat all information about it as confidential, including not discussing it with other staff. You may discuss it with your support person, but you must tell them that they are also required to keep it confidential.
If you have any questions, or would like to propose a different time, please contact me as soon as possible.
[[signoff]]`,
  },
  {
    key: "meeting-record",
    name: "Investigative / Disciplinary Meeting Record & Outcome",
    docType: "Disciplinary",
    description: "Minutes of the meeting: purpose, discussion, outcome, any disciplinary action and the employee's response. Both parties sign.",
    addressBlock: false,
    fields: [
      { key: "meetingType", label: "Meeting type", type: "select", required: true, options: ["Investigative Meeting", "Disciplinary Meeting", "Investigative and Disciplinary Meeting"], default: "Investigative Meeting" },
      { key: "meetingDate", label: "Meeting date", type: "shortdate", required: true },
      { key: "meetingTime", label: "Start time", type: "time", required: true },
      { key: "concludedTime", label: "Time concluded (optional)", type: "time" },
      { key: "attendees", label: "Attendees", type: "text", required: true, default: "Managing Director, {{employeeName}}" },
      { key: "purpose", label: "Purpose of the meeting", type: "textarea", required: true },
      { key: "supportNote", label: "Support person", type: "text", required: true, default: "The employee was advised of their right to have a support person present." },
      { key: "discussion", label: "Summary of discussion", type: "textarea", required: true },
      { key: "outcome", label: "Outcome", type: "textarea", required: true },
      { key: "action", label: "Disciplinary action (if any)", type: "textarea" },
      { key: "response", label: "Employee response", type: "textarea", required: true, default: "The employee confirmed they had nothing further to add." },
    ],
    body: `# {{meetingType}} — Record & Outcome
Employee: {{employeeName}}
Meeting type: {{meetingType}}
Date: {{meetingDate}}
Time: {{meetingTime}}
{{?concludedTime}}Concluded: {{concludedTime}}
Attendees: {{attendees}}
## Purpose of Meeting
{{purpose}}
## Support Person
{{supportNote}}
## Summary of Discussion
{{discussion}}
## Outcome
{{outcome}}
{{?action}}## Disciplinary Action
{{?action}}{{action}}
## Employee Response
{{response}}
I confirm these minutes are true and correct.
[[minutes-sign]]`,
  },
  {
    key: "verbal-warning",
    name: "Letter confirming Verbal Warning",
    docType: "Disciplinary",
    description: "Confirms a verbal warning after a meeting, records it on file, and asks the employee to sign that they have received and understood it.",
    addressBlock: true,
    fields: [
      { key: "meetingDate", label: "Date of the meeting", type: "date", required: true },
      { key: "matter", label: "What the warning is about", type: "textarea", required: true, help: "Describe the conduct and what was discussed." },
      { key: "response", label: "Employee's response at the meeting (optional)", type: "textarea" },
      { key: "standard", label: "Standard or policy not met", type: "text", required: true, default: "the Company Code of Conduct" },
      { key: "expectation", label: "Expectation reminded (optional)", type: "textarea" },
    ],
    body: `# WARNING RELATING TO YOUR CONDUCT
Dear {{employeeFirstName}},
Further to the meeting held with you on {{meetingDate}}, I confirm that you are being issued with a Verbal Warning in relation to the misconduct discussed at that meeting.
{{matter}}
{{?response}}{{response}}
This behaviour is misconduct and is not consistent with the standards expected of employees, including {{standard}}.
Please be advised that this verbal warning will remain on your file. Any further instances of similar or other misconduct may result in further disciplinary action, up to and including a written warning.
{{?expectation}}{{expectation}}
If you have any questions regarding this warning or the expectations moving forward, please do not hesitate to contact me. Otherwise, please confirm that you have received, read and understood this letter by signing below.
[[signoff]]
[[ack]]`,
  },
  {
    key: "written-warning",
    name: "Letter confirming Written Warning",
    docType: "Disciplinary",
    description: "Confirms a formal written warning: the breaches, that the employee could respond, any conditions, and a signed acknowledgement.",
    addressBlock: true,
    fields: [
      { key: "meetingDate", label: "Date of the meeting", type: "date", required: true },
      { key: "matter", label: "Reason for the warning (one line)", type: "text", required: true },
      { key: "breaches", label: "The breaches", type: "textarea", required: true, help: "One heading and short explanation per breach; start each heading on a new line with '- '." },
      { key: "conditions", label: "Conditions or changes that apply (optional)", type: "textarea", help: "e.g. arrangements that will be reviewed, with a review period." },
      { key: "notesAttached", label: "Meeting notes attached?", type: "select", options: ["Yes", "No"], default: "Yes" },
    ],
    body: `# WARNING RELATING TO YOUR CONDUCT
Dear {{employeeFirstName}},
Further to the investigation and disciplinary meeting held with you on {{meetingDate}}, I confirm that you are being issued with a formal written warning as a result of misconduct relating to {{matter}}. This matter was discussed with you during that meeting.
To summarise, the breaches of your employment obligations include:
{{breaches}}
These matters were discussed with you during the meeting, and you were given the opportunity to respond.
As outlined at the meeting, the seriousness of these breaches warrants a formal written warning. You were also advised that your actions have resulted in a loss of trust, which will need to be rebuilt over time.
{{?conditions}}{{conditions}}
{{?notesAttached}}{{notesAttachedText}}
Please be advised that any further instances of misconduct may result in further disciplinary action, up to and including termination of your employment.
Should you have any questions about this warning or anything set out above, please do not hesitate to contact me. Otherwise, please confirm that you have received, read and understood this letter by signing below and returning a copy to me.
[[signoff]]
[[ack]]`,
  },
  {
    key: "contract-variation",
    name: "Contract Variation",
    docType: "Variation",
    description: "A written variation to the employment agreement (e.g. after an annual review). The employee signs to accept.",
    addressBlock: false,
    fields: [
      { key: "reason", label: "Reason for the variation", type: "select", required: true, options: ["annual review", "change of role", "change of hours", "other agreed change"], default: "annual review" },
      { key: "intro", label: "Opening line (optional)", type: "textarea", help: "e.g. how they have performed. Leave blank to skip." },
      { key: "change", label: "The change", type: "textarea", required: true, help: "State the new term clearly, e.g. the new hourly rate and what it replaces." },
      { key: "effectiveDate", label: "Takes effect from", type: "shortdate", required: true },
      { key: "backPay", label: "Back pay or other note (optional)", type: "text" },
      { key: "respondBy", label: "Please return signed by", type: "shortdate", required: true },
    ],
    body: `# {{reasonTitle}} CONTRACT VARIATION
Dear {{employeeFirstName}},
{{?intro}}{{intro}}
{{change}}
This will take effect from {{effectiveDate}}.
{{?backPay}}{{backPay}}
In all other respects, your terms and conditions of employment will remain unchanged.
Should you have any questions about the information set out above, please do not hesitate to contact me. Otherwise, please indicate your acceptance of this change to your employment by signing at the bottom of this letter and returning a copy to me by {{respondBy}}.
[[signoff]]
[[ack]]`,
  },
  {
    key: "annual-review-invitation",
    name: "Invitation to Annual Review",
    docType: "Review",
    description: "Invites the employee to their review meeting and asks them to complete their self-assessment beforehand.",
    addressBlock: false,
    fields: [
      { key: "reviewPeriod", label: "Review period", type: "text", required: true, default: "the past 12 months" },
      { key: "meetingDate", label: "Meeting date", type: "date", required: true },
      { key: "meetingTime", label: "Meeting time", type: "time", required: true },
      { key: "meetingLocation", label: "Meeting location", type: "text", required: true, default: MEETING_PLACE },
      { key: "selfAssessmentDue", label: "Self-assessment due by", type: "shortdate", required: true },
      { key: "extra", label: "Anything else to mention (optional)", type: "textarea" },
    ],
    body: `# INVITATION TO ANNUAL REVIEW
Dear {{employeeFirstName}},
It is time for your annual review, covering {{reviewPeriod}}. This is a chance to talk about how you are going, recognise what is working well, and agree on goals and any support or training you would like.
Your review meeting is at {{meetingTime}} on {{meetingDate}}, at {{meetingLocation}}.
To prepare, please complete your self-assessment by {{selfAssessmentDue}}. You will see an alert in the Ali-Frame system when it is ready for you; it asks you to rate yourself against each area and to tell us what you would like to develop, and what would help you do your job better.
You are welcome to bring a support person with you.
{{?extra}}{{extra}}
If you have any questions, or need a different time, please let me know.
[[signoff]]`,
  },
];

export function getTemplate(key: string): HrTemplate | undefined {
  return HR_TEMPLATES.find((t) => t.key === key);
}

const longDate = (v: string, weekday: boolean) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return new Date(`${v}T12:00:00`).toLocaleDateString("en-NZ", { ...(weekday ? { weekday: "long" as const } : {}), day: "numeric", month: "long", year: "numeric" });
};
const clockTime = (v: string) => {
  const m = v.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return v;
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]}${h >= 12 ? "pm" : "am"}`;
};

/** Merge values into the template. Returns the final lines (textarea values expand to several lines). */
export function mergeTemplate(tpl: HrTemplate, values: Record<string, string>, builtins: Record<string, string>): string[] {
  const formatted: Record<string, string> = { ...builtins };
  for (const f of tpl.fields) {
    const raw = (values[f.key] ?? "").trim();
    formatted[f.key] = f.type === "date" ? longDate(raw, true) : f.type === "shortdate" ? longDate(raw, false) : f.type === "time" ? clockTime(raw) : raw;
  }
  // derived merge values
  formatted.reasonTitle = (values.reason ?? "").toUpperCase();
  formatted.notesAttachedText = values.notesAttached === "Yes" ? "I have attached a copy of the meeting notes to this letter, which set out the matters discussed in further detail." : "";
  // allow field defaults to use builtins (e.g. "{{employeeName}}")
  const fill = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => formatted[k] ?? "");
  for (const k of Object.keys(formatted)) formatted[k] = fill(formatted[k]);

  const out: string[] = [];
  for (const rawLine of tpl.body.split("\n")) {
    let line = rawLine;
    const cond = line.match(/^\{\{\?(\w+)\}\}/);
    if (cond) {
      if (!(formatted[cond[1]] ?? "").trim()) continue;
      line = line.replace(/^\{\{\?\w+\}\}/, "");
      // a second leading condition (e.g. heading + body pair)
      const cond2 = line.match(/^\{\{\?(\w+)\}\}/);
      if (cond2) {
        if (!(formatted[cond2[1]] ?? "").trim()) continue;
        line = line.replace(/^\{\{\?\w+\}\}/, "");
      }
    }
    line = fill(line);
    for (const piece of line.split("\n")) out.push(piece);
  }
  return out;
}

export function missingRequired(tpl: HrTemplate, values: Record<string, string>): string | null {
  for (const f of tpl.fields) if (f.required && !(values[f.key] ?? "").trim()) return f.label;
  return null;
}
