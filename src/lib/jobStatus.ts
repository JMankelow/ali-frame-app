// Real Job Statuses list, transcribed from Jo's SimPRO "Job Statuses" colour
// config (2026-09-26) — obvious typos ("Commerical", "Maintainence") corrected,
// exact duplicates removed. This is the authoritative list; anything using a
// different/invented status string should be treated as a bug.
export const JOB_STATUS_OPTIONS = [
  "New",
  "In Progress",
  "Completed",
  "Quote Sent",
  "Quote Sent to Supplier",
  "Quote Accepted",
  "Measure & Quoted Booked",
  "Check Measure Required",
  "Final Check Measure Complete",
  "Joinery Ordered",
  "Deposit Invoice Sent",
  "Installation Date Confirmed",
  "Commercial Acceptance",
  "Remedial Work Required",
  "Chargeable Maintenance",
  "Maintenance",
  "Tentative Sales Booking Awaiting",
  "Gone to Supplier for Requote",
  "To Quote off Measurements",
  "Followed Up After Quote Sent",
  "Commercial Quote Sent",
  "Follow-up Call Required",
  "Thinker",
  "Declined/No Go",
  "No Go",
];

// Mapped onto the app's existing 5 status colours (blue/green/orange/purple/grey)
// — closest match to Jo's real SimPRO palette rather than a 1:1 colour clone.
export const JOB_STATUS_COLOR: Record<string, string> = {
  New: "orange",
  "In Progress": "purple",
  Completed: "green",
  "Quote Sent": "orange",
  "Quote Sent to Supplier": "orange",
  "Quote Accepted": "green",
  "Measure & Quoted Booked": "blue",
  "Check Measure Required": "green",
  "Final Check Measure Complete": "blue",
  "Joinery Ordered": "purple",
  "Deposit Invoice Sent": "blue",
  "Installation Date Confirmed": "green",
  "Commercial Acceptance": "purple",
  "Remedial Work Required": "grey",
  "Chargeable Maintenance": "blue",
  Maintenance: "green",
  "Tentative Sales Booking Awaiting": "grey",
  "Gone to Supplier for Requote": "green",
  "To Quote off Measurements": "purple",
  "Followed Up After Quote Sent": "purple",
  "Commercial Quote Sent": "orange",
  "Follow-up Call Required": "orange",
  Thinker: "grey",
  "Declined/No Go": "grey",
  "No Go": "grey",
};

// Real "Job Pricing Types" list, from the same SimPRO config screen.
export const JOB_PRICE_TYPES = [
  "Residential Fixed Price",
  "Commercial Fixed Price",
  "Charge Up Rate",
  "Residential Kere",
  "Residential Dwayne",
  "Residential Tristam",
  "BAT",
];

// Real "Task Statuses" list from SimPRO, filtered to the job-relevant ones —
// the same source list also has staff leave/meeting/admin entries (Annual
// Leave, Sick Leave, Bereavement Leave, Public Holiday, Birthdays, internal
// meetings) that apply to a PERSON's calendar, not a job booking, so those
// aren't included here. Staff leave/holiday tracking (and pushing approved
// leave back from payroll into the calendar, per Jo's 2026-09-26 request) is
// a separate feature still to be built — not modelled on JobScheduledTask.
export const JOB_BOOKING_STATUSES = [
  "Floating",
  "Booked in",
  "Booking Confirmed",
  "Tentative Sales Booking Awaiting",
  "Check Measure Booked",
  "Sales Rep Booked - Dwayne",
  "Sales Rep Booked - Kere",
  "Sales Rep Booked - Tristam",
  "Sales Follow Up on Quote Sent",
  "Commercial Meeting",
  "On Measures / Meetings",
  "On tools",
  "Supply only",
  "Remedial",
  "90% invoiced",
  "Fully Invoiced",
];

// Real values from SimPRO's config screen — despite that screen's own label,
// Jo confirmed these are used as lead source / "how did they hear about us",
// not a task-priority ranking, so they get their own field here (never the
// unrelated Job.priority column).
export const JOB_LEAD_SOURCES = [
  "Phone Call",
  "Website",
  "Walk in",
  "Word of Mouth",
  "Supplier",
  "Social Media",
  "Web Search - Google Ads",
  "Returning Customer",
];
