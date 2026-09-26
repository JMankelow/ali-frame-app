import XLSX from "xlsx";
import { readdirSync } from "fs";
import { join } from "path";

const dir = "C:\\Users\\Jo Mankelow - New\\Downloads";
const fileName = readdirSync(dir).find((f) => f.includes("Job Tracking - Version") && f.includes("(3)"));
const wb = XLSX.readFile(join(dir, fileName));

const sheetName = wb.SheetNames.find((n) => n.trim() === "Commercial");
const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: false, defval: null });
console.log("Total rows:", rows.length);
for (let i = 0; i < 4; i++) {
  console.log(`Header row ${i}:`, JSON.stringify(rows[i]));
}
console.log("Sample data row (row 5):", JSON.stringify(rows[4]));
console.log("Sample data row (row 6):", JSON.stringify(rows[5]));
