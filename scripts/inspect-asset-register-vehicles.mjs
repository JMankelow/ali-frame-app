import XLSX from "xlsx";

const path = "C:/Users/Jo Mankelow - New/Downloads/ali_frame_windows_doors_202609301020_asset_items.csv.csv";
const wb = XLSX.readFile(path, { type: "file" });
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });

const vehicleRows = rows.filter((r) => !String(r["Categories"] ?? "").includes("Vehicle Tools"));
console.log("Vehicle-category rows:", vehicleRows.length);
for (const r of vehicleRows) {
  console.log(JSON.stringify(r, null, 2));
}
