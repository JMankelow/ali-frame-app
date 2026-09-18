"use client";

import Link from "next/link";

// Next.js redacts the real error message in production for anything thrown
// in a Server Component (so a permission error's text never leaks details a
// client shouldn't see) — this boundary shows one calm, generic message
// instead of the framework's raw stack-trace overlay, whatever the cause.
export default function AppSegmentError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card" style={{ maxWidth: 520, margin: "40px auto", textAlign: "center" }}>
      <h2>You don&apos;t have access to that, or something went wrong</h2>
      <p className="subtitle">
        Either this page needs a different account, or something briefly failed to load. Try again, or head back to
        the dashboard.
      </p>
      <div className="actions" style={{ justifyContent: "center", marginTop: 16 }}>
        <button className="btn light" onClick={() => reset()}>
          Try again
        </button>
        <Link href="/dashboard" className="btn primary">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
