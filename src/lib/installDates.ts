// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.

/**
 * Last day of an install that starts on `start` and runs for `installDays` working days (weekends skipped).
 * Returns null for a single-day install (no end date needed on the Calendar booking).
 */
export function installEndDate(start: Date, installDays: number | null | undefined): Date | null {
  const days = Math.ceil(installDays ?? 1);
  if (days <= 1) return null;
  const end = new Date(start);
  let remaining = days - 1;
  while (remaining > 0) {
    end.setUTCDate(end.getUTCDate() + 1);
    const dow = end.getUTCDay();
    if (dow !== 0 && dow !== 6) remaining -= 1;
  }
  return end;
}
