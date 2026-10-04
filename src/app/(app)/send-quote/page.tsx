// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SendQuoteForm } from "./SendQuoteForm";

export default async function SendQuotePage() {
  await requireUser();

  const [jobs, inputs] = await Promise.all([
    prisma.job.findMany({ where: { archived: false }, orderBy: { number: "asc" }, select: { number: true, title: true } }),
    prisma.jobQuoteInputs.findMany(),
  ]);

  // Quote Wording skill formula: ((supplier net x (1 + margin %)) + install price) x 1.025, excl. GST.
  const suggestedTotals: Record<string, number> = {};
  for (const i of inputs) {
    const supplierWithMargin = i.marginIsPercent ? i.supplierPrice * (1 + i.marginValue / 100) : i.supplierPrice + i.marginValue;
    suggestedTotals[i.jobNumber] = Math.round((supplierWithMargin + i.installAllowance) * 1.025 * 100) / 100;
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Send Quote</h2>
          <div className="subtitle">
            Pulls the pricing already entered in Prepare Price, takes the finished quote wording, builds the quote PDF,
            records it in the Quote Register and emails the client.
          </div>
        </div>
      </div>

      <SendQuoteForm jobs={jobs} suggestedTotals={suggestedTotals} />
    </div>
  );
}
