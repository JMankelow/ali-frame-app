import XLSX from "xlsx";

const path = "C:/Users/Jo Mankelow - New/Downloads/ali_frame_windows_doors_202609301020_asset_items.csv.csv";
const wb = XLSX.readFile(path, { type: "file" });
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });

console.log("Total rows:", rows.length);
console.log("Columns:", Object.keys(rows[0]));

const categories = new Set();
const assignees = new Set();
for (const r of rows) {
  if (r["Categories"]) categories.add(r["Categories"]);
  if (r["Assigned to"]) assignees.add(r["Assigned to"]);
}
console.log("\nDistinct categories:", categories.size);
console.log([...categories].join("\n"));
console.log("\nDistinct assignees:", assignees.size);
console.log([...assignees].join("\n"));
