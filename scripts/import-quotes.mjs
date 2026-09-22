// Imports the real Quotes export into the Quote table. Excludes Declined
// quotes entirely, per Jo's instruction (dropped at import, not just
// hidden). Idempotent: upserts by quoteNumber, safe to re-run.
import { PrismaClient } from "@prisma/client";
import XLSX from "xlsx";

const FILE_PATH = "C:\\Users\\Jo Mankelow - New\\Downloads\\Quotes (1).xlsx";

function parseCurrency(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = parseFloat(s.replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

// Dates are text like "31-Aug-2026".
function parseDate(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function extractJobNumber(reference) {
  if (!reference) return null;
  const m = String(reference).match(/JOB-(\d+)/i);
  return m ? m[1] : null;
}

async function main() {
  const wb = XLSX.readFile(FILE_PATH);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets["Sheet1"], { defval: null });
  console.log(`Read ${rows.length} rows`);

  const prisma = new PrismaClient();
  try {
    let created = 0;
    let updated = 0;
    let excluded = 0;

    for (const row of rows) {
      const status = String(row["Status"] ?? "").trim();
      if (status === "Declined") {
        excluded += 1;
        continue;
      }

      const quoteNumber = String(row["Quote No."] ?? "").trim();
      if (!quoteNumber) continue;

      const reference = row["Reference"] ? String(row["Reference"]).trim() : null;
      const jobNumberDigits = extractJobNumber(reference);

      let jobNumber = null;
      if (jobNumberDigits) {
        const job = await prisma.job.findUnique({ where: { number: jobNumberDigits } });
        if (job) jobNumber = job.number;
      }

      const data = {
        customerName: String(row["Customer"] ?? "").trim() || "Unknown",
        jobReference: reference,
        jobNumber,
        status: status || "Sent",
        total: parseCurrency(row["Total"]),
        amountInvoiced: parseCurrency(row["Amount Invoiced"]),
        amountRemaining: parseCurrency(row["Amount Remaining"]),
        quoteDate: parseDate(row["Quote Date"]),
        dateSent: parseDate(row["Date Sent"]),
        expiryDate: parseDate(row["Expiry Date"]),
        hasFiles: Boolean(row["Has Files"]),
      };

      const existing = await prisma.quote.findUnique({ where: { quoteNumber } });
      await prisma.quote.upsert({
        where: { quoteNumber },
        create: { quoteNumber, ...data },
        update: data,
      });
      existing ? (updated += 1) : (created += 1);
    }

    console.log(`Created ${created}, updated ${updated}, excluded (Declined) ${excluded}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
