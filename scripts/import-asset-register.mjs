// Real asset register export from Jo (2026-09-30) — the authoritative
// source for vehicle fleet details, driver assignment, and every tool asset.
// Wipes and re-imports Asset rows (previous import lacked person-level
// assignment and rich vehicle data this file provides).
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { randomBytes } from "crypto";
import XLSX from "xlsx";

const prisma = new PrismaClient();
const ARGON2_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

const path = "C:/Users/Jo Mankelow - New/Downloads/ali_frame_windows_doors_202609301020_asset_items.csv.csv";
const wb = XLSX.readFile(path, { type: "file" });
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });

// CSV "Assigned to" name -> our real User.name. Handles the asset register's
// own naming (some are shorter than the SharePoint-derived full names).
const NAME_MAP = {
  "Tristam Kingi": "Tristam Kingi",
  "Gulio Afu": "Gulio Folauola Puniani Afu",
  "Jake Iakopo": "Jake Iakopo",
  "Fita Fifita": "Fita Fifita",
  "Amanaki Fukofuka": "Amanaki Fukofuka",
  "Dwayne Bond": "Dwayne Bond",
  "Tanya Cleghorn": "Tanya Cleghorn",
  "Tim Beilby": "Tim Beilby",
  "Wae Warby": "Wae Warby",
};
// Mangled UTF-8 emoji prefix before "Siauane" in the source file.
function normalizeAssignee(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/^[^\w]+/, "").trim();
  if (cleaned === "Siauane") return "Siauane Siauane";
  // "Kere Taaka Tekaute" is left unmapped deliberately — flagged to Jo as a
  // possible collision with the separately-created "Kayden Tyler-Taaka
  // Tekaute" rather than silently merged.
  return NAME_MAP[cleaned] ?? cleaned;
}

function excelDateToJs(serial) {
  if (!serial || typeof serial !== "number") return null;
  return new Date(Math.round((serial - 25569) * 86400 * 1000));
}

async function ensureUser(name, email) {
  let user = await prisma.user.findFirst({ where: { name } });
  if (user) return user;
  const tempPassword = randomBytes(12).toString("base64url");
  const passwordHash = await hash(tempPassword, ARGON2_OPTIONS);
  user = await prisma.user.create({
    data: { name, email, passwordHash, role: "SENIOR_INSTALLER", mustResetPassword: true },
  });
  console.log(`Created new user: ${name}`);
  return user;
}

async function main() {
  // 1. Name corrections confirmed by this authoritative register.
  const tristam = await prisma.user.findFirst({ where: { name: "Tristam" } });
  if (tristam) await prisma.user.update({ where: { id: tristam.id }, data: { name: "Tristam Kingi" } });

  const aisea = await prisma.user.findFirst({ where: { name: "Aisea Fifita" } });
  if (aisea) await prisma.user.update({ where: { id: aisea.id }, data: { name: "Fita Fifita" } });

  // 2. New people.
  await ensureUser("Tim Beilby", "tim@aliframe.co.nz");
  await ensureUser("Wae Warby", "wae@aliframe.co.nz");

  // 3. New vehicle (trailer) not yet in our fleet.
  const trailer = await prisma.vehicle.findFirst({ where: { rego: "689P1" } });
  if (!trailer) {
    await prisma.vehicle.create({ data: { name: "689P1", rego: "689P1" } });
    console.log("Created vehicle 689P1 (Commercial Trailer).");
  }

  // 4. Vehicle rows: rich fleet data + driver assignment.
  const vehicleRows = rows.filter((r) => !String(r["Categories"] ?? "").includes("Vehicle Tools"));
  let vehiclesUpdated = 0;
  for (const r of vehicleRows) {
    const rego = String(r["Registration Number"] ?? "").trim();
    if (!rego) continue;
    const vehicle = await prisma.vehicle.findFirst({ where: { rego } });
    if (!vehicle) {
      console.log(`Skipped vehicle row for ${rego} — no matching Vehicle record.`);
      continue;
    }

    const assigneeName = normalizeAssignee(r["Assigned to"]);
    const assignee = assigneeName ? await prisma.user.findFirst({ where: { name: assigneeName } }) : null;
    if (r["Assigned to"] && !assignee) {
      console.log(`No user match for assignee "${r["Assigned to"]}" (rego ${rego}) — left unassigned.`);
    }

    await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: {
        assignedToUserId: assignee?.id ?? vehicle.assignedToUserId,
        vin: r["VIN"] ? String(r["VIN"]).trim() : null,
        insuranceCompany: r["Insurance Company"] ?? null,
        insurancePolicyNumber: r["Policy Number"] ?? null,
        preferredWorkshop: r["Preferred Workshop"] ?? null,
        fuelCardNumber: r["Fuel Card Number"] ? String(r["Fuel Card Number"]) : null,
        vehicleNotes: r["Vehicle Notes"] ?? null,
        currentOdometerKm: typeof r["Current Odometer (km)"] === "number" ? Math.round(r["Current Odometer (km)"]) : null,
        nextServiceDueKm: typeof r["Next Service Due (km)"] === "number" ? Math.round(r["Next Service Due (km)"]) : null,
        lastServiceDate: excelDateToJs(r["Last Service Date"]),
        regoDueDate: excelDateToJs(r["Registration Expiry"]),
        wofDueDate: excelDateToJs(r["WOF Expiry"]),
      },
    });
    vehiclesUpdated += 1;
  }
  console.log(`Updated ${vehiclesUpdated} vehicles with fleet/insurance data + driver assignment.`);

  // 5. Wipe previous tool-asset import (superseded by this authoritative file).
  const deleted = await prisma.asset.deleteMany({});
  console.log(`Cleared ${deleted.count} previously-imported assets.`);

  // 6. Tool asset rows.
  const toolRows = rows.filter((r) => String(r["Categories"] ?? "").includes("Vehicle Tools"));
  let created = 0;
  for (const r of toolRows) {
    const rego = String(r["Categories"]).split(" - ")[0].trim();
    const vehicle = await prisma.vehicle.findFirst({ where: { rego } });

    const assigneeName = normalizeAssignee(r["Assigned to"]);
    const assignee = assigneeName ? await prisma.user.findFirst({ where: { name: assigneeName } }) : null;

    const tagTestDate = excelDateToJs(r["Tag & Test Date "]);

    await prisma.asset.create({
      data: {
        name: r["Name [*]"] ?? r["Asset code [*]"],
        assetType: "Tools",
        assignedToVehicleId: vehicle?.id ?? null,
        assignedToUserId: assignee?.id ?? null,
        serialNumber: r["Serial Number"] ? String(r["Serial Number"]).trim() : null,
        estimatedValue: typeof r["Purchase amount"] === "number" ? r["Purchase amount"] : null,
        receiptNote: r["Additional details"] ? String(r["Additional details"]).trim() : null,
        testTagDueDate: tagTestDate,
      },
    });
    created += 1;
  }
  console.log(`Imported ${created} tool assets from the register.`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
