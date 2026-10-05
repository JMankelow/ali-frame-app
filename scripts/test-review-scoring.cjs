const ts = require("C:/Users/Jo Mankelow - New/OneDrive - BLB Consultants Ltd/Ali Frame Job Management System - Documents/ali-frame-app/node_modules/typescript");
const fs = require("fs");
const src = fs.readFileSync("C:/Users/Jo Mankelow - New/OneDrive - BLB Consultants Ltd/Ali Frame Job Management System - Documents/ali-frame-app/src/lib/reviewTemplates.ts", "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const m = { exports: {} };
new Function("module", "exports", js)(m, m.exports);
const R = m.exports;
let fails = 0;
const t = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`); };

const inst = R.getReviewTemplate("installer");
const sen = R.getReviewTemplate("senior-installer");
const all = (v) => Object.fromEntries(inst.sections.flatMap((s) => s.items.map((i) => [i.key, { r: v }])));
const items = inst.sections.reduce((n, s) => n + s.items.length, 0);
t("item count", items, 31);

let sc = R.scoreRatings(inst, all(3));
t("all 3s: total", sc.total, 93); t("all 3s: avg", sc.average, 3); t("all 3s: percent", Math.round(sc.percent), 60);
t("installer avg 3 -> level", R.recommendLevel(inst, 3), "Senior – Level 3");
t("installer avg 3 -> pay", R.recommendPayBand(inst, 3), "$30–$33");
t("installer avg 1 -> junior", R.recommendLevel(inst, 1), "Junior – Level 1");
t("installer avg 1 -> pay", R.recommendPayBand(inst, 1), "$24–$25");
t("installer avg 1.5 -> pay", R.recommendPayBand(inst, 1.5), "$26");
t("installer avg 2.5 -> level", R.recommendLevel(inst, 2.5), "Intermediate – Level 2");
t("installer avg 2.5 -> pay", R.recommendPayBand(inst, 2.5), "$28–$29");
t("installer avg 3.5 -> level", R.recommendLevel(inst, 3.5), "Senior – Level 4");
t("installer avg 4 -> level", R.recommendLevel(inst, 4), "Senior – Level 5");
t("installer avg 5 -> level", R.recommendLevel(inst, 5), "Senior / Lead – Level 6");
t("installer avg 5 -> pay", R.recommendPayBand(inst, 5), "$40–$45");
t("senior avg 3.3 -> level", R.recommendLevel(sen, 3.3), "Senior – Level 2");
t("senior avg 3.55 -> level", R.recommendLevel(sen, 3.55), "Senior – Level 3");
t("senior avg 3.7 -> level", R.recommendLevel(sen, 3.7), "Senior – Level 4");
t("senior avg 4.3 -> level", R.recommendLevel(sen, 4.3), "Senior – Level 5");
t("senior avg 3.4 -> pay", R.recommendPayBand(sen, 3.4), "$34–$36");
t("senior avg 4.3 -> pay", R.recommendPayBand(sen, 4.3), "$37–$38");
t("no ratings -> no level", R.recommendLevel(inst, null), "");

// N/O and blanks excluded
const mixed = all(4);
mixed.core_quality = { r: null, na: true };
mixed.core_problem = { r: null };
mixed.hs_ppe = { r: 2 };
sc = R.scoreRatings(inst, mixed);
t("N/O + blank excluded from rated count", sc.rated, 29);
t("mixed total", sc.total, 28 * 4 + 2);
t("mixed 3+ count", sc.atLeastThree, 28);
t("core section rated 3 of 5", sc.sections[0].rated, 3);
t("section avg", Math.round(sc.sections[0].average * 100) / 100, 4);

// Anna Chapman worked example: 189 / 65 = 2.908
t("worked example average", Math.round((189 / 65) * 1000) / 1000, 2.908);
console.log(fails ? `\n${fails} FAILURE(S)` : "\nAll review scoring checks passed");
process.exit(fails ? 1 : 0);
