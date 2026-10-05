// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Imports "BLB_Daily_Cashflow_Forecast_Sep26-Sep27 v6.xlsx" into the Cashflow tables:
//   - every dated line on the monthly tabs (Sep26..Sep27) -> CashflowEntry (source "workbook-v6")
//   - opening balance / limits -> CashflowSetting
//   - Job Pipeline, Assumptions, Past Months -> CashflowSetting as JSON reference tables
// Re-running replaces only the rows it created before (source "workbook-v6"); lines added in the app are kept.
// Usage: node scripts/import-cashflow.mjs "<workbook.xlsx>"
import { PrismaClient } from "@prisma/client";
import { readGrid, excelDate } from "./lib/readXlsx.mjs";

const file = process.argv[2];
if (!file) throw new Error('Usage: node scripts/import-cashflow.mjs "<workbook.xlsx>"');

const num = (v) => (typeof v === "number" ? v : v === "" || v == null ? 0 : Number(v) || 0);
const str = (v) => (v == null ? "" : String(v).trim());
const iso = (serial) => (typeof serial === "number" ? excelDate(serial).toISOString().slice(0, 10) : null);

const prisma = new PrismaClient();
try {
  // ---- ledger lines: monthly tabs are sheets 5..17 ----
  const entries = [];
  for (let sheet = 5; sheet <= 17; sheet++) {
    const grid = readGrid(file, { sheet });
    const header = Array.from(grid[1] ?? [], (h) => str(h).toLowerCase());
    const col = (name) => header.findIndex((h) => h.startsWith(name));
    const cDate = col("date"), cDetails = col("details"), cDebit = col("debit"), cCredit = col("credit"), cCat = col("category"), cNotes = col("notes");
    if ([cDate, cDetails, cDebit, cCredit].some((i) => i < 0)) throw new Error(`Sheet ${sheet}: unexpected headings ${JSON.stringify(header)}`);
    for (let r = 3; r < grid.length; r++) {
      const row = grid[r];
      if (!row) continue;
      const details = str(row[cDetails]);
      if (/^(add extra|totals)/i.test(details)) break;
      const date = row[cDate];
      const debit = num(row[cDebit]);
      const credit = num(row[cCredit]);
      if (typeof date !== "number" || !details || (debit === 0 && credit === 0)) continue;
      entries.push({
        date: excelDate(date),
        details: details.slice(0, 300),
        debit,
        credit,
        category: cCat >= 0 ? str(row[cCat]) || null : null,
        notes: cNotes >= 0 ? str(row[cNotes]) || null : null,
        source: "workbook-v6",
      });
    }
  }

  // ---- reference tables ----
  const pipeGrid = readGrid(file, { sheet: 19 });
  const pipeHeader = Array.from(pipeGrid[4] ?? [], str);
  const pipeRows = [];
  for (let r = 5; r < pipeGrid.length; r++) {
    const row = pipeGrid[r];
    if (!row || !str(row[1])) continue;
    pipeRows.push(Array.from(row, (v, i) => (/date|due/i.test(pipeHeader[i] ?? "") && typeof v === "number" ? iso(v) : v === "" ? null : v)));
  }

  const aGrid = readGrid(file, { sheet: 21 });
  const assumptions = [];
  for (let r = 4; r < aGrid.length; r++) {
    const row = aGrid[r];
    if (!row || !str(row[1])) continue;
    const v = row[2];
    assumptions.push({ input: str(row[1]), value: typeof v === "number" && v > 40000 && v < 60000 ? iso(v) : v === "" ? null : v, note: str(row[3]) });
  }

  const pmGrid = readGrid(file, { sheet: 22 });
  const pastMonths = [];
  for (let r = 4; r < pmGrid.length; r++) {
    const row = pmGrid[r];
    if (!row || typeof row[1] !== "number" || typeof row[2] !== "number") continue;
    pastMonths.push({ month: iso(row[1]).slice(0, 7), receipts: row[2], payments: row[3], note: str(row[5]) || null });
  }

  const settings = {
    openingDate: "2026-09-25",
    openingBalance: "-176516.09",
    limitTemporary: "300000",
    limitTemporaryUntil: "2026-10-21", // the workbook uses $300k through Wed 21 Oct, $200k from Thu 22 Oct
    limitNormal: "200000",
    warningBuffer: "20000",
    forecastStart: "2026-09-28",
    pipeline: JSON.stringify({ header: pipeHeader, rows: pipeRows }),
    assumptions: JSON.stringify(assumptions),
    pastMonths: JSON.stringify(pastMonths),
  };

  await prisma.cashflowEntry.deleteMany({ where: { source: "workbook-v6" } });
  await prisma.cashflowEntry.createMany({ data: entries });
  for (const [key, value] of Object.entries(settings)) {
    await prisma.cashflowSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }

  const out = entries.reduce((s, e) => s + e.debit, 0);
  const inn = entries.reduce((s, e) => s + e.credit, 0);
  console.log(`Imported ${entries.length} ledger lines (in ${inn.toFixed(2)}, out ${out.toFixed(2)}); pipeline ${pipeRows.length} jobs; ${assumptions.length} assumptions; ${pastMonths.length} past months.`);
  console.log(`Expected from workbook Summary: in 5,619,257.49 + 43,282.89? out 5,484,908.04 (+123,631.18 Sep)`);
} finally {
  await prisma.$disconnect();
}
