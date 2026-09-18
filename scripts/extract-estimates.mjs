import { readFileSync, writeFileSync } from "fs";

const filePath =
  "C:\\Users\\Jo Mankelow - New\\OneDrive - BLB Consultants Ltd\\Ali Frame - Sales & Operations - Documents\\4 - Estimate App\\ali_frame_estimates.html";
const html = readFileSync(filePath, "utf-8");

const start = html.indexOf("const SEED_ESTIMATES = ") + "const SEED_ESTIMATES = ".length;
const arrayStart = html.indexOf("[", start);
// Find the matching closing bracket by bracket-depth counting (safer than a naive lastIndexOf).
let depth = 0;
let end = -1;
for (let i = arrayStart; i < html.length; i++) {
  if (html[i] === "[") depth++;
  if (html[i] === "]") {
    depth--;
    if (depth === 0) {
      end = i + 1;
      break;
    }
  }
}
if (end === -1) throw new Error("Could not find the end of SEED_ESTIMATES array");

const jsonText = html.slice(arrayStart, end);
const records = JSON.parse(jsonText);
console.log(`Extracted ${records.length} estimate records`);
console.log("Sample keys:", Object.keys(records[0]));

writeFileSync("scripts/estimates-data.json", JSON.stringify(records, null, 2));
console.log("Wrote scripts/estimates-data.json");
