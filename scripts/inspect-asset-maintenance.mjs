import XLSX from "xlsx";

const path =
  "C:/Users/Jo Mankelow - New/OneDrive - BLB Consultants Ltd/Ali Frame - Sales & Operations - Documents/Assets/Asset Maintainence List - CORRECT ONE.xlsx";
const wb = XLSX.readFile(path);
console.log("Sheets:", wb.SheetNames);
for (const name of wb.SheetNames) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: null });
  console.log("\n===", name, "rows:", rows.length, "===");
  console.log("row0:", JSON.stringify(rows[0]));
  console.log("row1:", JSON.stringify(rows[1]));
  console.log("row2:", JSON.stringify(rows[2]));
  console.log("row3:", JSON.stringify(rows[3]));
}
