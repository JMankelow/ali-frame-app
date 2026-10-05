// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.

// Plain module (no "use client") so the server page can use the array — a constant exported from a client
// component reaches a server component as an opaque reference, which crashed /calendar (".includes is not a function").
export const ALL_TYPES = ["Installation", "Check Measure", "Sales Measure", "Remedial", "Leave", "Vehicle Maintenance"];
