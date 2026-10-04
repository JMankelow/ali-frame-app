import { readSheet } from "./lib/readXlsx.mjs";
const [f, sheet] = [process.argv[2], Number(process.argv[3] ?? 1)];
const { headers, rows } = readSheet(f, { sheet, headerRow: 0 });
console.log("HEADERS:", JSON.stringify(headers));
for (const r of rows) console.log(JSON.stringify(Object.values(r)));
