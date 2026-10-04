// 1) Backfills assetCode (and value if missing) on the already-imported tool assets from the asset register CSV.
// 2) Imports Siauane's tools (KEA545) from Assets.xlsx — they were never in the register export.
//   node scripts/asset-register-fixes.mjs "<asset_items.csv>" "<Assets.xlsx>" [--dry-run]
// Idempotent: tools are matched/created by (vehicle, name, serial).
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { readGrid, excelDate } from "./lib/readXlsx.mjs";

const [csvPath, xlsxPath] = process.argv.slice(2);
const DRY = process.argv.includes("--dry-run");

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}
const norm = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

const p = new PrismaClient();
try {
  // ---- 1. asset codes ----
  const [head, ...data] = parseCsv(readFileSync(csvPath, "utf8"));
  const col = (n) => head.findIndex((h) => h.startsWith(n));
  const iCode = col("Asset code"), iName = col("Name"), iCat = col("Categories"), iSerial = col("Serial"), iAmt = col("Purchase amount");
  const vehicles = await p.vehicle.findMany();
  let coded = 0, missing = 0;
  for (const r of data) {
    if (!r[iCode] || !/Vehicle Tools/.test(r[iCat] ?? "")) continue;
    const rego = r[iCat].split(" - ")[0].trim();
    const vehicle = vehicles.find((v) => v.rego === rego);
    if (!vehicle) continue;
    const serial = r[iSerial] ? String(r[iSerial]).trim() : null;
    const cands = await p.asset.findMany({ where: { assignedToVehicleId: vehicle.id, assetCode: null } });
    const hit = cands.find((a) => norm(a.name) === norm(r[iName]) && (a.serialNumber ?? null) === serial) ?? cands.find((a) => norm(a.name) === norm(r[iName]));
    if (!hit) { missing++; continue; }
    const amt = parseFloat(r[iAmt]);
    if (!DRY) await p.asset.update({ where: { id: hit.id }, data: { assetCode: r[iCode], estimatedValue: hit.estimatedValue ?? (Number.isFinite(amt) ? amt : null) } });
    coded++;
  }
  console.log(`${DRY ? "[dry] " : ""}asset codes set: ${coded} (unmatched CSV rows: ${missing})`);

  // ---- 2. Siauane's tools (KEA545 sheet) ----
  const user = await p.user.findFirst({ where: { name: { contains: "Siauane", mode: "insensitive" } } });
  const kea = vehicles.find((v) => v.rego === "KEA545" || v.name === "KEA545");
  if (!user || !kea) throw new Error("Could not find Siauane or vehicle KEA545");
  const grid = readGrid(xlsxPath, { sheet: 2 });
  const cell = (r, c) => (grid[r - 1]?.[c] ?? null);
  const parseDate = (v) => {
    if (typeof v === "number") return excelDate(v);
    const m = String(v ?? "").match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    return m ? new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], 12)) : null;
  };
  const items = [];
  // Block A: original kit (rows 5-31): [_, qty note, tool, serial, value]
  for (let r = 5; r <= 31; r++) {
    const name = String(cell(r, 2) ?? "").trim();
    const serial = cell(r, 3), value = cell(r, 4);
    if (!name || (value === "" || value == null) && !serial) continue;
    items.push({ name, serial, value: typeof value === "number" ? value : null, date: null, block: "Original kit" });
  }
  // Block B: new tools Oct–Nov 2024 (rows 41-79): [_, date, tool, serial, value]; blank dates carry forward
  let last = null;
  for (let r = 41; r <= 79; r++) {
    const d = parseDate(cell(r, 1));
    if (d) last = d;
    const name = String(cell(r, 2) ?? "").trim();
    if (!name) continue;
    const value = cell(r, 4);
    items.push({ name, serial: cell(r, 3), value: typeof value === "number" ? value : null, date: last, block: "New tools Oct–Nov 2024" });
  }
  // Block D: Nov 2025 list (rows 101-113): no values on the sheet (block total $3,999.14 is not itemised)
  last = null;
  for (let r = 101; r <= 113; r++) {
    const d = parseDate(cell(r, 1));
    if (d) last = d;
    const name = String(cell(r, 2) ?? "").trim();
    if (!name) continue;
    items.push({ name, serial: cell(r, 3), value: null, date: last, block: "Nov 2025 list" });
  }
  // (Rows 89-97 "Claim made" are an insurance claim, not tools on hand — deliberately skipped.)

  const existing = await p.asset.findMany({ where: { assignedToVehicleId: kea.id } });
  let created = 0, skipped = 0, n = existing.length;
  for (const it of items) {
    const serial = it.serial == null || it.serial === "" ? null : String(it.serial).trim();
    if (existing.some((a) => norm(a.name) === norm(it.name) && (a.serialNumber ?? null) === serial)) { skipped++; continue; }
    n += 1;
    created++;
    if (!DRY)
      await p.asset.create({
        data: {
          name: it.name,
          assetType: "Tools",
          assetCode: `AF-KEA545-${String(n).padStart(3, "0")}`,
          assignedToUserId: user.id,
          assignedToVehicleId: kea.id,
          serialNumber: serial,
          estimatedValue: it.value,
          purchaseDate: it.date,
          description: `From Assets.xlsx (KEA545 sheet) — ${it.block}`,
        },
      });
  }
  const sum = items.reduce((s, i) => s + (i.value ?? 0), 0);
  console.log(`${DRY ? "[dry] " : ""}Siauane tools: ${created} created, ${skipped} already there. Itemised value on sheet rows: $${sum.toFixed(2)} across ${items.filter((i) => i.value != null).length} valued items (${items.filter((i) => i.value == null).length} items have no value on the sheet).`);
  for (const b of ["Original kit", "New tools Oct–Nov 2024", "Nov 2025 list"]) console.log(`   ${b}: ${items.filter((i) => i.block === b).length} items, $${items.filter((i) => i.block === b).reduce((s, i) => s + (i.value ?? 0), 0).toFixed(2)}`);
} finally {
  await p.$disconnect();
}
