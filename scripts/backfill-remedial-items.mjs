// Backfills the operational RemedialItem table from the historical remedial
// data already imported into JobCosting (remedialFlag etc, from the real Job
// Tracking spreadsheet) so the Remedial page actually shows this real data
// instead of sitting inert in JobCosting. Idempotent: skips a job if it
// already has a RemedialItem tagged with the import marker below.
import { PrismaClient } from "@prisma/client";

const MARKER = "[Imported from Job Tracking spreadsheet]";
const CLAUDE_USER_EMAIL = "claude@aliframe.local";

function money(v) {
  return v == null ? "—" : `$${v.toFixed(2)}`;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const claudeUser = await prisma.user.findUnique({ where: { email: CLAUDE_USER_EMAIL } });
    const flagged = await prisma.jobCosting.findMany({
      where: { remedialFlag: true },
      include: { job: true },
    });

    let created = 0;
    let skipped = 0;

    for (const jc of flagged) {
      const existing = await prisma.remedialItem.findFirst({
        where: { jobNumber: jc.jobNumber, issue: { contains: MARKER } },
      });
      if (existing) {
        skipped += 1;
        continue;
      }

      const parts = [MARKER];
      if (jc.remedialSeniorName) parts.push(`Senior: ${jc.remedialSeniorName}`);
      if (jc.remedialCE) parts.push(`C/E: ${jc.remedialCE}`);
      parts.push(`Cost: ${money(jc.remedialCost)}, Updated Cost: ${money(jc.remedialUpdatedCost)}`);
      if (jc.remedialMarginPct != null) parts.push(`Margin: ${jc.remedialMarginPct}%`);

      const isComplete = jc.job.status === "Complete";

      await prisma.remedialItem.create({
        data: {
          jobNumber: jc.jobNumber,
          issue: parts.join(" — "),
          priority: "Normal",
          status: isComplete ? "Resolved" : "Open",
          resolvedAt: isComplete ? jc.job.updatedAt : null,
          raisedById: claudeUser?.id ?? null,
        },
      });
      created += 1;
    }

    console.log(`Created ${created} RemedialItem rows, skipped ${skipped} already-imported.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
