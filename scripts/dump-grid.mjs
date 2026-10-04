import { readGrid } from "./lib/readXlsx.mjs";
const g = readGrid(process.argv[2], { sheet: Number(process.argv[3] ?? 1) });
g.forEach((r, i) => { if (r && r.some((v) => v != null && v !== "")) console.log(String(i + 1).padStart(3), JSON.stringify(r.map((v) => v ?? ""))); });
