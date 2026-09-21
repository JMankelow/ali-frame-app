import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function EstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const estimate = await prisma.estimate.findUnique({ where: { id } });
  if (!estimate) notFound();

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>{estimate.clientName}</h2>
          <div className="subtitle">{estimate.address}</div>
        </div>
        <Link href="/estimates" className="btn light">
          ← All Estimates
        </Link>
      </div>

      <div className="notice">
        This shows everything captured when the original enquiry email was processed — the app doesn&apos;t store the
        raw original email text itself, only these extracted fields. If you need the literal email, it&apos;d be in
        the original Outlook export.
      </div>

      <div className="card">
        <div className="form">
          <div>
            <label>Status</label>
            <div>{estimate.status}</div>
          </div>
          <div>
            <label>Category</label>
            <div>{estimate.category ?? "—"}</div>
          </div>
          <div>
            <label>Joinery Type</label>
            <div>{estimate.joineryType ?? "—"}</div>
          </div>
          <div>
            <label>Size</label>
            <div>{estimate.size ?? (estimate.widthMM && estimate.heightMM ? `${estimate.widthMM} x ${estimate.heightMM}mm` : "—")}</div>
          </div>
          <div>
            <label>Cladding</label>
            <div>{estimate.cladding ?? "—"}</div>
          </div>
          <div>
            <label>Estimated Cost</label>
            <div>{estimate.estimatedCostText ?? "—"}</div>
          </div>
          <div>
            <label>Received</label>
            <div>{estimate.dateReceived ? estimate.dateReceived.toLocaleDateString("en-NZ") : "—"}</div>
          </div>
          <div className="full">
            <label>Joinery Description (from the enquiry)</label>
            <div style={{ whiteSpace: "pre-wrap" }}>{estimate.joineryDescription ?? "—"}</div>
          </div>
          <div className="full">
            <label>Notes</label>
            <div style={{ whiteSpace: "pre-wrap" }}>{estimate.notes ?? "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
