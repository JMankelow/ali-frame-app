// Imports non-sensitive employment details from the iPayroll staff export into EmployeeDetail.
//   node scripts/import-staff.mjs "<staff-detailed-table .xlsx>" [--dry-run]
//
// What is imported: preferred name, personal email (the sheet's Email column), address, job title,
// start/finish dates, hours per week, and pay rate — pay ONLY for non-management.
// What is NOT imported, on purpose: IRD/tax numbers, bank accounts, tax codes, KiwiSaver, date of birth.
// Management = app role ADMIN_MANAGEMENT, super user, or a job title containing manager/director/owner/supervisor.
// Idempotent: upserts by user. Unmatched people are listed, not created.
import { PrismaClient } from "@prisma/client";
import { readSheet, excelDate } from "./lib/readXlsx.mjs";

const file = process.argv[2];
const DRY = process.argv.includes("--dry-run");
if (!file) {
  console.error("Pass the path to the staff export .xlsx");
  process.exit(1);
}

// People whose name in iPayroll differs from the app (nicknames / reordered names) -> app login email.
const ALIASES = {
  "20": "fita@aliframe.co.nz", // Aisea Niua Fifita
  "30": "tapu@aliframe.co.nz", // Hauhautapu Siosiufale
  "31": "kaumea@aliframe.co.nz", // Fale (Kaumea) Veainu (Siosiuafale)
  "36": "accounts@aliframe.co.nz", // Rennae Naera (Renae)
};

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z ]/g, "").split(/\s+/).filter(Boolean);
const text = (v) => (v == null || String(v).trim() === "" ? null : String(v).trim());
const MGMT_TITLE = /manager|director|owner|supervisor/i;

const { rows } = readSheet(file, { sheet: 1 });
const p = new PrismaClient();
try {
  const users = await p.user.findMany();
  let done = 0;
  const unmatched = [];
  for (const r of rows) {
    const id = String(r["Id"]);
    const first = norm(r["Preferred Name"] || r["First Names"])[0];
    const firstAlt = norm(r["First Names"])[0];
    const last = norm(r["Surname"]).slice(-1)[0];
    let user = ALIASES[id] ? users.find((u) => u.email === ALIASES[id]) : null;
    if (!user) {
      const hits = users.filter((u) => {
        const t = norm(u.name);
        return (t[0] === first || t[0] === firstAlt) && (t.includes(last) || t[t.length - 1] === last);
      });
      if (hits.length === 1) user = hits[0];
    }
    const fullName = `${r["First Names"]} ${r["Surname"]}`.replace(/\s+/g, " ");
    if (!user) {
      unmatched.push(`${fullName} (${text(r["Job Title"]) ?? "no title"})`);
      continue;
    }

    const title = text(r["Job Title"]);
    const isManagement = user.role === "ADMIN_MANAGEMENT" || user.isSuperUser || (title ? MGMT_TITLE.test(title) : false) || String(r["Proprietor"] ?? "").toLowerCase().startsWith("yes");
    const data = {
      preferredName: text(r["Preferred Name"]),
      personalEmail: text(r["Email"])?.toLowerCase() ?? null,
      address: text(r["Address"]),
      jobTitle: title,
      startDate: excelDate(r["Start"]),
      finishDate: excelDate(r["Finish"]),
      hoursPerWeek: typeof r["Hours Per Week"] === "number" ? r["Hours Per Week"] : null,
      isManagement,
      payRate: isManagement ? null : typeof r["Rate"] === "number" ? r["Rate"] : null,
      payType: isManagement ? null : text(r["Rate Type"]),
      annualSalary: isManagement ? null : typeof r["Annual Salary"] === "number" ? r["Annual Salary"] : null,
      source: "iPayroll staff export 2026-10-05",
    };
    console.log(`${DRY ? "[dry] " : ""}${fullName.padEnd(34)} -> ${user.name.padEnd(30)} ${isManagement ? "MANAGEMENT (no pay stored)" : `pay stored (${data.payType ?? "?"})`}`);
    if (!DRY) {
      await p.employeeDetail.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
      const phone = text(r["Phone Number"]);
      if (phone && !user.phone) await p.user.update({ where: { id: user.id }, data: { phone } });
    }
    done += 1;
  }
  console.log(`\n${DRY ? "Would import" : "Imported"} ${done} of ${rows.length}.`);
  if (unmatched.length) console.log("No matching app user (not created):\n  " + unmatched.join("\n  "));
} finally {
  await p.$disconnect();
}
