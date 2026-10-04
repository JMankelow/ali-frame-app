// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.

// The monthly vehicle check — Ali-Frame's 26-point checklist (previously run in SiteApp Pro).
// Items 1–7 (operator/vehicle, date, odometer, WOF, rego, service) and 26 (signature) are handled
// as dedicated fields on the form; this list covers the Yes/No questions (items 9–25).

export type ChecklistAnswer = "Yes" | "No" | "N/A";

export interface ChecklistQuestion {
  key: string;
  section: "Interior of vehicle" | "Exterior of vehicle" | "Sign off";
  text: string;
  /** The answer that counts as a failure and needs a reason. */
  bad: "Yes" | "No";
  allowNA?: boolean;
  /** "No" here means the vehicle is not safe to operate → critical alert. */
  critical?: boolean;
}

export const MONTHLY_QUESTIONS: ChecklistQuestion[] = [
  { key: "horn", section: "Interior of vehicle", text: "Is the horn functional?", bad: "No" },
  { key: "seatbelts", section: "Interior of vehicle", text: "Are all seatbelts in good condition and functional for all seating positions?", bad: "No" },
  { key: "warning_lights", section: "Interior of vehicle", text: "Are there any illuminated dashboard warning lights (excluding handbrake/seatbelt during startup)?", bad: "Yes" },
  { key: "steering", section: "Interior of vehicle", text: "Is the steering free from excessive play?", bad: "No" },
  { key: "brakes", section: "Interior of vehicle", text: "Are the foot brake and handbrake/parking brake effective?", bad: "No" },
  { key: "interior_tidy", section: "Interior of vehicle", text: "Is the vehicle interior clean and tidy, free from loose items that could become projectiles?", bad: "No" },
  { key: "first_aid", section: "Interior of vehicle", text: "Is a First Aid Kit present, fully stocked?", bad: "No", allowNA: true },
  { key: "bodywork", section: "Exterior of vehicle", text: "Is the vehicle's exterior bodywork free from major damage, excessive rust, or sharp edges?", bad: "No" },
  { key: "lights", section: "Exterior of vehicle", text: "Are all exterior lights functional (headlights, tail lights, brake lights, indicators, hazard lights, reversing lights)?", bad: "No" },
  { key: "tyres", section: "Exterior of vehicle", text: "Are all tyres (including spare) in good condition, with adequate tread depth and correct pressure, and are wheel nuts secure?", bad: "No" },
  { key: "glass", section: "Exterior of vehicle", text: "Are windscreens, all windows, and exterior mirrors clean, undamaged, and provide clear vision?", bad: "No" },
  { key: "wipers", section: "Exterior of vehicle", text: "Are wipers and washers functional with adequate fluid?", bad: "No" },
  { key: "fluids", section: "Exterior of vehicle", text: "Are engine oil, coolant and brake fluid levels acceptable?", bad: "No" },
  { key: "other_defects", section: "Sign off", text: "Are there any other observed defects or concerns that might affect safety or compliance?", bad: "Yes" },
  { key: "safe_today", section: "Sign off", text: "Is the vehicle safe and suitable for its intended operation today?", bad: "No", critical: true },
];

export interface MonthlyResponses {
  version: 1;
  date: string; // yyyy-mm-dd
  odometerKm: number;
  wofExpiry: string;
  regoExpiry: string;
  serviceDate: string;
  serviceKms: string;
  answers: Record<string, { answer: ChecklistAnswer; reason: string }>;
  signedBy: string;
  signedAt: string; // ISO
}

export function isFailure(q: ChecklistQuestion, answer: ChecklistAnswer): boolean {
  return answer === q.bad;
}

export function parseMonthlyResponses(raw: string | null | undefined): MonthlyResponses | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && parsed.version === 1 ? (parsed as MonthlyResponses) : null;
  } catch {
    return null;
  }
}

/** One-line summary used in the emailed reminder. */
export const MONTHLY_ITEM_SUMMARY = [
  "Odometer, WOF expiry, registration expiry and service details",
  "Interior: horn, seatbelts, dashboard warning lights, steering, brakes, tidiness, first aid kit",
  "Exterior: bodywork, lights, tyres (incl. spare), glass and mirrors, wipers/washers, fluid levels",
  "Sign-off: other defects, safe to operate today, signature",
];
