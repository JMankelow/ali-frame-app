import XLSX from "xlsx";
import { readdirSync } from "fs";
import { join } from "path";

const dir = "C:\\Users\\Jo Mankelow - New\\Downloads";
const fileName = readdirSync(dir).find((f) => f.includes("Job Tracking - Version") && f.includes("(3)"));
const wb = XLSX.readFile(join(dir, fileName));
const sheetName = wb.SheetNames.find((n) => n.trim() === "Residential");
const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: false, defval: null }).slice(5);

const seniors = new Set();
const dates = [];
let rowsWithSenior = 0;
let rowsWithDate = 0;
for (const r of rows) {
  if (!r[3]) continue; // no Job No
  if (r[23]) { seniors.add(String(r[23]).trim()); rowsWithSenior++; }
  if (r[24]) { dates.push(r[24]); rowsWithDate++; }
}
console.log("Distinct Senior values:", [...seniors]);
console.log("Rows with Senior set:", rowsWithSenior);
console.log("Rows with Install Date set:", rowsWithDate);
console.log("Sample dates:", dates.slice(0, 10));
