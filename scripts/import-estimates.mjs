// Imports the real estimate records embedded in the standalone "Ali Frame
// Estimates" prototype HTML (SEED_ESTIMATES array) into the real Estimate
// table. Idempotent: skips a record if one with the same clientName +
// dateReceived already exists. Reads the source HTML directly rather than
// keeping a separate extracted-data file in the repo, since that file would
// otherwise be a raw customer-PII dump with no reason to live in git.
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const SOURCE_HTML =
  "C:\\Users\\Jo Mankelow - New\\OneDrive - BLB Consultants Ltd\\Ali Frame - Sales & Operations - Documents\\4 - Estimate App\\ali_frame_estimates.html";

function extractSeedEstimates(html) {
  const marker = "const SEED_ESTIMATES = ";
  const start = html.indexOf(marker) + marker.length;
  const arrayStart = html.indexOf("[", start);
  let depth = 0;
  let end = -1;
  for (let i = arrayStart; i < html.length; i++) {
    if (html[i] === "[") depth++;
    if (html[i] === "]") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end === -1) throw new Error("Could not find the end of SEED_ESTIMATES array");
  return JSON.parse(html.slice(arrayStart, end));
}

async function main() {
  const html = readFileSync(SOURCE_HTML, "utf-8");
  const records = extractSeedEstimates(html);
  console.log(`Extracted ${records.length} estimate records from the source HTML`);

  const prisma = new PrismaClient();
  try {
    let created = 0;
    let skipped = 0;

    for (const r of records) {
      const dateReceived = r.dateReceived ? new Date(r.dateReceived) : null;
      const existing = await prisma.estimate.findFirst({
        where: { clientName: r.clientName, dateReceived },
      });
      if (existing) {
        skipped += 1;
        continue;
      }

      await prisma.estimate.create({
        data: {
          clientName: r.clientName,
          address: r.address ?? null,
          category: r.category ?? null,
          joineryDescription: r.joineryDescription ?? null,
          size: r.size ?? null,
          estimatedCostText: r.estimatedCostText ?? null,
          estimatedCostLowNZD: r.estimatedCostLowNZD ?? null,
          estimatedCostHighNZD: r.estimatedCostHighNZD ?? null,
          status: r.status ?? "Quoted",
          dateReceived,
          notes: r.notes ?? null,
          widthMM: r.widthMM ?? null,
          heightMM: r.heightMM ?? null,
          cladding: r.cladding ?? null,
          joineryType: r.joineryType ?? null,
        },
      });
      created += 1;
    }

    console.log(`Created ${created} estimates, skipped ${skipped} already-imported.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
