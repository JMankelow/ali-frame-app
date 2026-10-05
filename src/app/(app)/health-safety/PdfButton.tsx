// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.

/** Opens a properly laid-out PDF built on the server — never a print of the web page. */
export function PdfButton({ href, label = "Download PDF" }: { href: string; label?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="btn light no-print">
      {label}
    </a>
  );
}
