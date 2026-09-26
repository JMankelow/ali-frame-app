// Updates existing Job records with the new "Install Date" (Senior/Install
// Date columns just added to the Residential sheet's Install block) from the
// latest Job Tracking export. Only updates jobs that already exist — this is
// a targeted field update, not a re-import.
import { PrismaClient } from "@prisma/client";
import XLSX from "xlsx";
import { readdirSync } from "fs";
import { join } from "path";

const dir = "C:\\Users\\Jo Mankelow - New\\Downloads";
const fileName = readdirSync(dir).find((f) => f.includes("Job Tracking - Version") && f.includes("(3)"));
if (!fileName) throw new Error("Could not find the updated Job Tracking spreadsheet in Downloads");

const wb = XLSX.readFile(join(dir, fileName));
const sheetName = wb.SheetNames.find((n) => n.trim() === "Residential");
const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: false, defval: null }).slice(5);

// Install Date is D/M/YYYY (4-digit year) — different from the DD/M/YY
// pattern used elsewhere in this workbook.
function parseDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return new Date(Date.UTC(parseInt(y, 10), parseInt(mo, 10) - 1, parseInt(d, 10)));
}

async function main() {
  const prisma = new PrismaClient();
  try {
    let updated = 0;
    let skippedNoDate = 0;
    let skippedNoJob = 0;

    for (const row of rows) {
      const jobNumber = row[3] ? String(row[3]).trim() : null;
      if (!jobNumber) continue;

      const installDate = parseDate(row[24]);
      if (!installDate) {
        skippedNoDate += 1;
        continue;
      }

      const existing = await prisma.job.findUnique({ where: { number: jobNumber } });
      if (!existing) {
        skippedNoJob += 1;
        continue;
      }

      await prisma.job.update({ where: { number: jobNumber }, data: { startDate: installDate } });
      updated += 1;
    }

    console.log(`Updated ${updated} jobs with an install/start date.`);
    console.log(`Skipped ${skippedNoDate} rows with no install date, ${skippedNoJob} with no matching Job record.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
