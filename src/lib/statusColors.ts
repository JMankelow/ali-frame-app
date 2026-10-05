// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.

// The two colour palettes from Jo's NextMinute configuration, so the calendar and job lists look the same:
//   - Task (booking) statuses  -> calendar bookings
//   - Job statuses             -> status pills on jobs
// Names are matched ignoring case and the typos in the source ("Commerical", "Maintainence", "Breavement").

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/commerical/g, "commercial")
    .replace(/maintainence/g, "maintenance")
    .replace(/breavement/g, "bereavement")
    .replace(/\s+/g, " ")
    .trim();

const TASK_PALETTE: Record<string, string> = {
  floating: "#22dd44",
  "booked in": "#2f86e8",
  "booking confirmed": "#fa3a12",
  "90% invoiced": "#b800a8",
  "fully invoiced": "#111111",
  "check measure booked": "#2bf544",
  "sales rep booked - dwayne": "#09f0e0",
  remedial: "#f020e0",
  "sales follow up on quote sent": "#f5f500",
  "supply only": "#f59e0b",
  "tentative sales booking awaiting": "#a8a8a0",
  "commercial meeting": "#c8f500",
  "office time - dont book": "#d98a8a",
  "annual leave": "#fb6b8e",
  "public holiday": "#28c8fa",
  "sick leave": "#f8f000",
  "bereavement leave": "#8a0c0c",
  maintenance: "#14f52a",
  "on tools": "#908888",
  "on measures / meetings": "#efefef",
  "sales rep booked - kere": "#0a9af0",
  "sales rep booked - tristam": "#8adcf0",
  "jtbc - meetings": "#f00af0",
  birthdays: "#f0c8f0",
  "monthly management meeting": "#e85a14",
  "monthly sales meeting": "#f5083c",
};

const JOB_PALETTE: Record<string, string> = {
  "in progress": "#7b3fe4",
  new: "#e06655",
  completed: "#1ef03c",
  "quote sent": "#ece81a",
  "quote sent to supplier": "#f5a50f",
  "quote accepted": "#2de8b4",
  "final check measure complete": "#14a8e8",
  "measure & quoted booked": "#1b3ddb",
  "declined/no go": "#000000",
  "check measure required": "#33e62b",
  "joinery ordered": "#f53df5",
  "no go": "#5e5858",
  "deposit invoice sent": "#17908f",
  "installation date confirmed": "#46c426",
  "remedial work required": "#7a7272",
  "commercial acceptance": "#e8bde0",
  "chargeable maintenance": "#1deef3",
  "tentative sales booking awaiting": "#d1c9c9",
  "gone to supplier for requote": "#8fab9a",
  "gone to supplier for re-quote": "#8fab9a",
  "to quote off measurements": "#f77be2",
  "followed up done after quote sent": "#f50fb8",
  "followed up after quote sent": "#f50fb8",
  "commercial quote sent": "#f4f5c4",
  thinker: "#5a5757",
  "follow-up call required": "#f52b1c",
  maintenance: "#2bff12",
  jtbc: "#ef23e5",
};

/** Readable text colour (dark or white) for a given background hex. */
export function textOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#0f172a" : "#ffffff";
}

export function taskStatusHex(status: string | null | undefined): string | null {
  return status ? TASK_PALETTE[norm(status)] ?? null : null;
}

export function jobStatusHex(status: string | null | undefined): string | null {
  return status ? JOB_PALETTE[norm(status)] ?? null : null;
}

/** Inline style for a job-status pill, or undefined to fall back to the class colour. */
export function jobStatusStyle(status: string | null | undefined): { background: string; color: string } | undefined {
  const hex = jobStatusHex(status);
  return hex ? { background: hex, color: textOn(hex) } : undefined;
}
