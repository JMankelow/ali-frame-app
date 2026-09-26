import "server-only";
import { prisma } from "./prisma";
import { createWipJournalPair } from "./xeroJournals";

// Real Job.status values (see src/lib/jobStatus.ts) that sit between
// acceptance and install-confirmed — i.e. work that's underway but not yet
// installed/invoiced, which is what "WIP" means here.
export const WIP_STATUSES = [
  "Quote Accepted",
  "Deposit Invoice Sent",
  "Check Measure Required",
  "Final Check Measure Complete",
  "Measure & Quoted Booked",
  "Joinery Ordered",
  "Installation Date Confirmed",
  "Commercial Acceptance",
];

export async function getWipJobs() {
  return prisma.job.findMany({
    where: { archived: false, status: { in: WIP_STATUSES } },
    include: { client: true, costing: { select: { quotedTotal: true } } },
    orderBy: { number: "asc" },
  });
}

function lastDayOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
}

/** Computes the current Residential/Commercial WIP split, snapshots it, and creates the paired DRAFT Xero journals. Safe to call more than once a month — each call is its own snapshot row. */
export async function postMonthlyWipSnapshot(): Promise<{ snapshotId: string; residentialTotal: number; commercialTotal: number }> {
  const jobs = await getWipJobs();
  const residentialTotal = jobs.filter((j) => j.type === "RESIDENTIAL").reduce((sum, j) => sum + (j.costing?.quotedTotal ?? 0), 0);
  const commercialTotal = jobs.filter((j) => j.type === "COMMERCIAL").reduce((sum, j) => sum + (j.costing?.quotedTotal ?? 0), 0);

  const monthEndDate = lastDayOfMonth(new Date());

  const { journalId, reversalJournalId } = await createWipJournalPair({
    monthEndDate,
    residentialTotal,
    commercialTotal,
  });

  const snapshot = await prisma.wipSnapshot.create({
    data: {
      snapshotDate: monthEndDate,
      residentialTotal,
      commercialTotal,
      jobNumbers: jobs.map((j) => j.number),
      xeroJournalId: journalId,
      xeroReversalJournalId: reversalJournalId,
    },
  });

  return { snapshotId: snapshot.id, residentialTotal, commercialTotal };
}
