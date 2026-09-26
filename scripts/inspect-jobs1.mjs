import XLSX from "xlsx";

const path = "C:/Users/Jo Mankelow - New/Downloads/Jobs (1).xlsx";
const wb = XLSX.readFile(path);
console.log("Sheets:", wb.SheetNames);
for (const name of wb.SheetNames) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: null });
  console.log("---", name, "rows:", rows.length);
  console.log("header row 0:", JSON.stringify(rows[0]));
  console.log("sample row 1:", JSON.stringify(rows[1]));
  console.log("sample row 2:", JSON.stringify(rows[2]));
}
