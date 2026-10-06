// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.

/** Newest job number first. Job numbers are text, so a database sort puts "9999" above "12261" — sort them as numbers instead. */
export function byNumberDesc<T extends { number: string }>(jobs: T[]): T[] {
  return [...jobs].sort((a, b) => Number(b.number) - Number(a.number));
}
