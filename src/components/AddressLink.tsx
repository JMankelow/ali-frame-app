// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.

/** An address that opens in Google Maps (search link — no API key or account needed). */
export function AddressLink({ address, fallback = "—" }: { address: string | null | undefined; fallback?: string }) {
  const text = (address ?? "").trim();
  if (!text) return <>{fallback}</>;
  return (
    <a
      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: "var(--blueDark)", textDecoration: "none" }}
      title="Open in Google Maps"
      onClick={(e) => e.stopPropagation()}
    >
      {text} ↗
    </a>
  );
}
