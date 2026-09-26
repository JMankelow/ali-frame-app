import XLSX from "xlsx";
import { readdirSync } from "fs";
import { join } from "path";

const dir = "C:\\Users\\Jo Mankelow - New\\Downloads";
const fileName = readdirSync(dir).find((f) => f.includes("Job Tracking - Version") && f.includes("(3)"));
console.log("Using file:", fileName);
const wb = XLSX.readFile(join(dir, fileName));
console.log("Sheets:", wb.SheetNames.map((n) => n.trim()));

const sheetName = wb.SheetNames.find((n) => n.trim() === "Residential");
const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: false, defval: null });
console.log("Total rows:", rows.length);

// Print all 5 header rows fully so every column is visible, plus one sample data row.
for (let i = 0; i < 5; i++) {
  console.log(`Header row ${i}:`, JSON.stringify(rows[i]));
}
console.log("Sample data row (row 6):", JSON.stringify(rows[5]));
console.log("Sample data row (row 7):", JSON.stringify(rows[6]));
