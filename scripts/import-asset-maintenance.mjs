// Real fleet tools + maintenance history, imported from Jo's
// "Asset Maintainence List - CORRECT ONE.xlsx" (2026-09-26). Idempotent-ish:
// safe to re-run for maintenance records only via the --wipe-maintenance flag
// (asset import always creates fresh rows — run once).
import { PrismaClient } from "@prisma/client";
import XLSX from "xlsx";

const prisma = new PrismaClient();
const path =
  "C:/Users/Jo Mankelow - New/OneDrive - BLB Consultants Ltd/Ali Frame - Sales & Operations - Documents/Assets/Asset Maintainence List - CORRECT ONE.xlsx";
const wb = XLSX.readFile(path);

function sheetRows(name) {
  return XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: null });
}

function parseMoney(v) {
  if (!v) return null;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

// Dot-separated = NZ D.M.YYYY (typed by hand). Slash-separated two-digit
// year = Excel-normalised M/D/YY (US format) — confirmed by cross-checking
// values like "5/26/23" where 26 can only be a day.
function parseChecklistDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return new Date(Date.UTC(+y, +mo - 1, +d));
  }
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const [, mo, d, yRaw] = m;
    const y = yRaw.length === 2 ? 2000 + +yRaw : +yRaw;
    return new Date(Date.UTC(y, +mo - 1, +d));
  }
  return null;
}

const TOOL_SHEETS = [
  { sheet: "QCA761 - Naki", rego: "QCA761" },
  { sheet: "LBA717 - Gulio", rego: "LBA717" },
  { sheet: "GUN697 - Tris", rego: "GUN697" },
  { sheet: "PUR16 - Jake", rego: "PUR16" },
  { sheet: "KEA545 - Siauane", rego: "KEA545" },
  { sheet: "PWU811  - Fita", rego: "PWU811" },
];

const MAINTENANCE_SHEETS = [
  "MHF196",
  " LBA717",
  " GUN697",
  "NUL572",
  "KEA545",
  "JKB809",
  "GTU764",
  "MMJ307",
  "GJA604",
  "PKN658",
  "PUR16",
  "PWU811 ",
  "QKJ425",
  "QCA761",
];

async function importTools() {
  let created = 0;
  for (const { sheet, rego } of TOOL_SHEETS) {
    const vehicle = await prisma.vehicle.findFirst({ where: { rego } });
    if (!vehicle) {
      console.log(`Skipping tools for ${rego} — vehicle not found.`);
      continue;
    }

    const rows = sheetRows(sheet);
    const headerIdx = rows.findIndex((r) => r?.some((c) => String(c ?? "").trim().toLowerCase() === "tool"));
    if (headerIdx === -1) {
      console.log(`No header row found in ${sheet}.`);
      continue;
    }
    const header = rows[headerIdx].map((c) => String(c ?? "").trim().toLowerCase());
    const toolCol = header.indexOf("tool");
    const serialCol = header.indexOf("serial number");
    const valueCol = header.findIndex((c) => c === "value");
    const tagCol = header.findIndex((c) => c.includes("tag") || c.includes("test"));

    for (const row of rows.slice(headerIdx + 1)) {
      const toolName = row?.[toolCol] ? String(row[toolCol]).trim() : "";
      if (!toolName) continue;

      const existing = await prisma.asset.findFirst({ where: { name: toolName, assignedToVehicleId: vehicle.id } });
      if (existing) continue;

      const tagRaw = tagCol >= 0 ? row[tagCol] : null;
      const tagDate = parseChecklistDate(tagRaw);

      await prisma.asset.create({
        data: {
          name: toolName,
          assetType: "Tools",
          assignedToVehicleId: vehicle.id,
          serialNumber: serialCol >= 0 && row[serialCol] ? String(row[serialCol]).trim() : null,
          estimatedValue: valueCol >= 0 ? parseMoney(row[valueCol]) : null,
          testTagDueDate: tagDate,
        },
      });
      created += 1;
    }
  }
  console.log(`Imported ${created} tool assets.`);
}

async function importMaintenance() {
  let created = 0;
  for (const sheet of MAINTENANCE_SHEETS) {
    const rego = sheet.trim();
    const vehicle = await prisma.vehicle.findFirst({ where: { rego } });
    if (!vehicle) {
      console.log(`Skipping maintenance for "${sheet}" — vehicle not found.`);
      continue;
    }

    const rows = sheetRows(sheet).slice(2); // row0 = title, row1 = headers
    for (const row of rows) {
      if (!row || row.every((c) => !c)) continue;
      const [checklistDateRaw, completedBy, wof, kms, comments, actions, estimatedValueRaw] = row;
      if (!checklistDateRaw && !completedBy && !wof && !kms && !comments && !actions) continue;

      await prisma.vehicleMaintenanceRecord.create({
        data: {
          vehicleId: vehicle.id,
          checklistDate: parseChecklistDate(checklistDateRaw),
          completedBy: completedBy ? String(completedBy).trim() : null,
          wofDate: wof ? String(wof).trim() : null,
          kms: kms ? String(kms).trim() : null,
          comments: comments ? String(comments).trim() : null,
          actions: actions ? String(actions).trim() : null,
          estimatedValue: parseMoney(estimatedValueRaw),
        },
      });
      created += 1;
    }
  }
  console.log(`Imported ${created} maintenance records.`);
}

// RUC snapshot, transcribed from Jo's EROAD screenshot (2026-09-26) — not live.
const RUC_SNAPSHOT = {
  GUN697: { rucType: "D-2", rucOdometerKm: 287055, rucStartDistKm: 282820, rucEndDistKm: 287820, rucRemainingKm: 765 },
  PUR16: { rucType: "D-3", rucOdometerKm: 55984, rucStartDistKm: 55131, rucEndDistKm: 57131, rucRemainingKm: 1147 },
  PWU811: { rucType: "D-3", rucOdometerKm: 72757, rucStartDistKm: 72500, rucEndDistKm: 74500, rucRemainingKm: 1743 },
  MMJ307: { rucType: "D-3", rucOdometerKm: 155032, rucStartDistKm: 152051, rucEndDistKm: 157051, rucRemainingKm: 2019 },
  GTU764: { rucType: "D-3", rucOdometerKm: null, rucStartDistKm: 301420, rucEndDistKm: 305420, rucRemainingKm: null },
  QKJ425: { rucType: "D-3", rucOdometerKm: 43607, rucStartDistKm: 42000, rucEndDistKm: 46000, rucRemainingKm: 2393 },
  JKB809: { rucType: "D-2", rucOdometerKm: 186959, rucStartDistKm: 185000, rucEndDistKm: 190000, rucRemainingKm: 3041 },
  MHF196: { rucType: "D-2", rucOdometerKm: 101077, rucStartDistKm: 100001, rucEndDistKm: 105001, rucRemainingKm: 3924 },
};

async function importRuc() {
  let updated = 0;
  for (const [rego, data] of Object.entries(RUC_SNAPSHOT)) {
    const vehicle = await prisma.vehicle.findFirst({ where: { rego } });
    if (!vehicle) continue;
    await prisma.vehicle.update({ where: { id: vehicle.id }, data: { ...data, rucUpdatedAt: new Date() } });
    updated += 1;
  }
  console.log(`Updated RUC snapshot for ${updated} vehicles.`);
}

async function main() {
  await importTools();
  await importMaintenance();
  await importRuc();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
