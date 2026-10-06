// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useEffect, useRef } from "react";

/**
 * React resets an edit form to its *original* values the moment a save finishes, so drop-downs and dates
 * flash back to what they were before the save (it looks like the data was wiped). Closing the form on a
 * successful save shows the freshly-saved values instead.
 */
export function useCloseOnSuccess(pending: boolean, error: string | undefined, onDone: () => void) {
  const was = useRef(false);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (was.current && !pending && !error) done.current();
    was.current = pending;
  }, [pending, error]);
}
