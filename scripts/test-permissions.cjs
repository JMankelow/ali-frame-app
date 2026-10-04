const ts = require("C:/Users/Jo Mankelow - New/OneDrive - BLB Consultants Ltd/Ali Frame Job Management System - Documents/ali-frame-app/node_modules/typescript");
const fs = require("fs");
const src = fs.readFileSync("C:/Users/Jo Mankelow - New/OneDrive - BLB Consultants Ltd/Ali Frame Job Management System - Documents/ali-frame-app/src/lib/permissions.ts", "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const m = { exports: {} };
new Function("module", "exports", js)(m, m.exports);
const P = m.exports;

let fails = 0;
const t = (name, got, want) => { const ok = got === want; if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (got ${got}, want ${want})`); };

const inst = { isSuperUser: false, role: "JUNIOR_INSTALLER", permissions: [] };
const admin = { isSuperUser: false, role: "ADMIN_MANAGEMENT", permissions: [] };
const sup = { isSuperUser: true, role: "ADMIN_MANAGEMENT", permissions: [] };
const restrictedAdmin = { isSuperUser: false, role: "ADMIN_MANAGEMENT", permissions: ["Sales"] };
const instWidened = { isSuperUser: false, role: "SENIOR_INSTALLER", permissions: ["Installers", "Accounts", "Human Resources"] };

for (const s of P.SECTIONS) {
  t(`super sees ${s}`, P.hasSectionAccess(sup, s), true);
  t(`installer sees ${s}`, P.hasSectionAccess(inst, s), s === "Installers");
}
t("admin (non-super) sees Accounts", P.hasSectionAccess(admin, "Accounts"), false);
t("admin (non-super) sees Sales", P.hasSectionAccess(admin, "Sales"), true);
t("admin (non-super) sees Human Resources", P.hasSectionAccess(admin, "Human Resources"), true);
t("restricted admin sees Jobs", P.hasSectionAccess(restrictedAdmin, "Jobs"), false);
t("installer w/ widened permissions still no Accounts", P.hasSectionAccess(instWidened, "Accounts"), false);
t("installer w/ widened permissions still no HR", P.hasSectionAccess(instWidened, "Human Resources"), false);

for (const r of ["SENIOR_INSTALLER", "INTERMEDIATE_INSTALLER", "JUNIOR_INSTALLER", "CREW_MOBILE", "CONTRACTOR"]) t(`${r} is installer profile`, P.isInstallerProfile({ isSuperUser: false, role: r }), true);
for (const r of ["ADMIN_MANAGEMENT", "OFFICE_SCHEDULING", "SALES", "READ_ONLY"]) t(`${r} is NOT installer profile`, P.isInstallerProfile({ isSuperUser: false, role: r }), false);
t("super user with installer role is not restricted", P.isInstallerProfile({ isSuperUser: true, role: "SENIOR_INSTALLER" }), false);

const allowed = ["/dashboard", "/calendar", "/jobs", "/jobs/10662", "/crew", "/timesheets", "/assets", "/vehicles", "/vehicles/checklist/abc", "/health-safety", "/health-safety/sssp/10662", "/policies", "/policies/file/x"];
const blocked = ["/payroll", "/costing", "/wip", "/cashflow", "/invoicing/sales", "/reports/profit-loss", "/users", "/employees", "/employees/123", "/leads", "/estimates", "/quotes", "/purchase-orders", "/send-quote", "/settings", "/backup", "/security", "/notes", "/templates", "/performance", "/vehicles-evil", "/jobsx", "", "/"];
for (const p of allowed) t(`installer may open ${p}`, P.isInstallerAllowedPath(p), true);
for (const p of blocked) t(`installer blocked from "${p}"`, P.isInstallerAllowedPath(p), false);
t("/payroll is super-only", P.isSuperOnlyPath("/payroll"), true);
t("/payroll/x is super-only", P.isSuperOnlyPath("/payroll/x"), true);
t("/payrollx is not matched", P.isSuperOnlyPath("/payrollx"), false);
console.log(fails ? `\n${fails} FAILURE(S)` : "\nAll permission checks passed");
process.exit(fails ? 1 : 0);
