// One-off import of the real "Ali Frame - Job Tracking - Version  2.xlsx"
// spreadsheet into Client/Job/JobCosting. Run with:
//   node scripts/import-job-tracking.mjs [--dry-run]
// Safe to re-run: upserts Job by number (spreadsheet duplicates get an
// -A/-B suffix so they stay distinct), upserts JobCosting 1:1 by jobNumber,
// and dedupes Client by exact trimmed name.

import XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import { readdirSync } from "fs";
import { join } from "path";

const DRY_RUN = process.argv.includes("--dry-run");

const SPREADSHEET_DIR =
  "C:\\Users\\Jo Mankelow - New\\OneDrive - BLB Consultants Ltd\\Ali Frame - Sales & Operations - Documents\\Job Costings 2026";

function findSpreadsheet() {
  const match = readdirSync(SPREADSHEET_DIR).find((f) => f.includes("Job Tracking - Version") && f.endsWith("2.xlsx"));
  if (!match) throw new Error("Could not find the Job Tracking spreadsheet in " + SPREADSHEET_DIR);
  return join(SPREADSHEET_DIR, match);
}

function parseCurrency(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === "-" || s === "$-" || /^\$?-\s*$/.test(s)) return null;
  const n = parseFloat(s.replace(/[$,]/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function parseNumber(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === "-") return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function parsePercent(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = parseFloat(s.replace(/%/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function parseYesNo(v) {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (s === "yes" || s === "y") return true;
  if (s === "no" || s === "n") return false;
  return null;
}

// Spreadsheet dates are NZ D/M/YY text, e.g. "11/6/26" -> 11 June 2026.
function parseNzDate(v) {
  if (v == null) return null;
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const year = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
  return new Date(Date.UTC(year, parseInt(mo, 10) - 1, parseInt(d, 10)));
}

function str(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function findSheetName(workbook, wanted) {
  const match = workbook.SheetNames.find((n) => n.trim() === wanted);
  if (!match) throw new Error(`Sheet "${wanted}" not found (have: ${workbook.SheetNames.join(", ")})`);
  return match;
}

function readSheetRows(workbook, sheetName, dataStartRow) {
  const sheet = workbook.Sheets[findSheetName(workbook, sheetName)];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });
  return rows.slice(dataStartRow);
}

function mapResidentialRow(row) {
  const jobNumber = str(row[3]);
  if (!jobNumber) return null;

  return {
    jobNumber,
    jobType: "RESIDENTIAL",
    status: str(row[0]) ?? "New",
    clientName: str(row[4]),
    address: str(row[5]),
    phone: str(row[6]),
    email: str(row[7]),
    supplier: str(row[10]),
    poNumber: str(row[11]),
    costing: {
      quoteNumber: str(row[2]),
      dateAccepted: parseNzDate(row[1]),
      quotedTotal: parseCurrency(row[8]),
      deposit: parseCurrency(row[9]),
      scaffolding: str(row[13]),
      materialsQuoted: parseCurrency(row[14]),
      materialsActual: parseCurrency(row[15]),
      rubbishQuoted: parseCurrency(row[17]),
      rubbishActual: parseCurrency(row[18]),
      installQuoted: parseCurrency(row[20]),
      installActual: parseCurrency(row[21]),
      labourHoursQuoted: parseNumber(row[23]),
      labourHoursCM: parseNumber(row[24]),
      labourHoursActual: parseNumber(row[25]),
      marginQuoted: parseCurrency(row[27]),
      marginOverheadAmount: parseCurrency(row[28]),
      marginActual: parseCurrency(row[29]),
      marginProfit: parseCurrency(row[30]),
      marginPct: parsePercent(row[31]),
      remedialFlag: parseYesNo(row[32]),
      remedialCE: str(row[33]),
      remedialName: str(row[34]),
      remedialSeniorName: str(row[35]),
      remedialLabourHours: parseNumber(row[36]),
      remedialLabourCost: parseCurrency(row[37]),
      remedialDamage: parseCurrency(row[38]),
      remedialMaterial: parseCurrency(row[39]),
      remedialCost: parseCurrency(row[40]),
      remedialUpdatedCost: parseCurrency(row[41]),
      remedialProfit: parseCurrency(row[42]),
      remedialMarginPct: parsePercent(row[43]),
      photosDocumented: parseYesNo(row[44]),
      qaDocumented: parseYesNo(row[45]),
    },
  };
}

function mapCommercialRow(row) {
  const jobNumber = str(row[2]);
  if (!jobNumber) return null;

  const notesParts = [];
  if (str(row[7])) notesParts.push(`Customer: ${str(row[7])}`);

  return {
    jobNumber,
    jobType: "COMMERCIAL",
    status: str(row[0]) ?? "New",
    clientName: str(row[3]),
    address: str(row[4]),
    phone: null,
    email: null,
    supplier: null,
    poNumber: str(row[8]),
    costing: {
      quoteNumber: str(row[1]),
      dateAccepted: null,
      quotedTotal: null,
      deposit: null,
      scaffolding: null,
      materialsQuoted: parseCurrency(row[10]),
      materialsActual: parseCurrency(row[11]),
      rubbishQuoted: parseCurrency(row[13]),
      rubbishActual: parseCurrency(row[14]),
      installQuoted: parseCurrency(row[16]),
      installActual: parseCurrency(row[17]),
      labourHoursQuoted: parseNumber(row[19]),
      labourHoursCM: parseNumber(row[20]),
      labourHoursActual: parseNumber(row[21]),
      marginQuoted: parseCurrency(row[23]),
      marginOverheadAmount: parseCurrency(row[24]),
      marginActual: parseCurrency(row[25]),
      marginProfit: parseCurrency(row[26]),
      marginPct: parsePercent(row[27]),
      remedialFlag: parseYesNo(row[28]),
      remedialCE: str(row[29]),
      remedialName: null,
      remedialSeniorName: str(row[30]),
      remedialLabourHours: parseNumber(row[31]),
      remedialLabourCost: parseCurrency(row[32]),
      remedialDamage: parseCurrency(row[33]),
      remedialMaterial: parseCurrency(row[34]),
      remedialCost: parseCurrency(row[35]),
      remedialUpdatedCost: parseCurrency(row[36]),
      remedialProfit: parseCurrency(row[37]),
      remedialMarginPct: parsePercent(row[38]),
      photosDocumented: parseYesNo(row[39]),
      qaDocumented: parseYesNo(row[40]),
      hsDocumented: parseYesNo(row[41]),
      projectManager: str(row[5]),
      sssp: str(row[6]),
      commercialNotes: notesParts.length ? notesParts.join("; ") : null,
    },
  };
}

function dedupeJobNumbers(records) {
  const seen = new Map();
  for (const rec of records) {
    if (!seen.has(rec.jobNumber)) {
      seen.set(rec.jobNumber, [rec]);
    } else {
      seen.get(rec.jobNumber).push(rec);
    }
  }
  const out = [];
  for (const group of seen.values()) {
    if (group.length === 1) {
      out.push(group[0]);
    } else {
      const suffixes = "ABCDEFGH";
      group.forEach((rec, i) => {
        out.push({ ...rec, jobNumber: `${rec.jobNumber}-${suffixes[i]}` });
      });
    }
  }
  return out;
}

async function main() {
  const filePath = findSpreadsheet();
  console.log(`Reading ${filePath}`);
  const workbook = XLSX.readFile(filePath);

  const residentialRows = readSheetRows(workbook, "Residential", 5);
  const commercialRows = readSheetRows(workbook, "Commercial", 4);

  const residential = residentialRows.map(mapResidentialRow).filter(Boolean);
  const commercial = commercialRows.map(mapCommercialRow).filter(Boolean);

  console.log(`Residential rows with a Job No: ${residential.length}`);
  console.log(`Commercial rows with a Job No: ${commercial.length}`);

  const allRecords = dedupeJobNumbers([...residential, ...commercial]);
  console.log(`Total distinct job records to import (after de-duplicating Job Nos): ${allRecords.length}`);

  if (DRY_RUN) {
    console.log("--dry-run: not writing to the database. Sample record:");
    console.log(JSON.stringify(allRecords[0], null, 2));
    return;
  }

  const prisma = new PrismaClient();
  try {
    let clientsCreated = 0;
    let jobsCreated = 0;
    let jobsUpdated = 0;

    for (const rec of allRecords) {
      let clientId = null;
      if (rec.clientName) {
        const existing = await prisma.client.findFirst({
          where: { name: { equals: rec.clientName, mode: "insensitive" } },
        });
        if (existing) {
          clientId = existing.id;
        } else {
          const created = await prisma.client.create({
            data: {
              name: rec.clientName,
              phone: rec.phone,
              email: rec.email,
              address: rec.address,
            },
          });
          clientId = created.id;
          clientsCreated += 1;
        }
      }

      const existingJob = await prisma.job.findUnique({ where: { number: rec.jobNumber } });

      await prisma.job.upsert({
        where: { number: rec.jobNumber },
        create: {
          number: rec.jobNumber,
          title: rec.clientName ?? rec.jobNumber,
          address: rec.address,
          clientId,
          type: rec.jobType,
          status: rec.status,
          supplier: rec.supplier,
          poNumber: rec.poNumber,
          phone: rec.phone,
          email: rec.email,
          archived: rec.status === "Complete",
        },
        update: {
          title: rec.clientName ?? rec.jobNumber,
          address: rec.address,
          clientId,
          type: rec.jobType,
          status: rec.status,
          supplier: rec.supplier,
          poNumber: rec.poNumber,
          phone: rec.phone,
          email: rec.email,
          archived: rec.status === "Complete",
        },
      });
      existingJob ? (jobsUpdated += 1) : (jobsCreated += 1);

      await prisma.jobCosting.upsert({
        where: { jobNumber: rec.jobNumber },
        create: { jobNumber: rec.jobNumber, ...rec.costing },
        update: { ...rec.costing },
      });
    }

    console.log(`Clients created: ${clientsCreated}`);
    console.log(`Jobs created: ${jobsCreated}, updated: ${jobsUpdated}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
