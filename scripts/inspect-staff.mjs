// Prints ONLY non-sensitive columns of the iPayroll staff export, plus how each row would match an app user.
import { PrismaClient } from "@prisma/client";
import { readSheet, excelDate } from "./lib/readXlsx.mjs";

const file = process.argv[2];
const { rows } = readSheet(file, { sheet: 1 });
const p = new PrismaClient();
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z ]/g, "").split(/\s+/).filter(Boolean);
try {
  const users = await p.user.findMany({ select: { id: true, name: true, email: true, role: true, isSuperUser: true, isActive: true } });
  for (const r of rows) {
    const first = norm(r["Preferred Name"] || r["First Names"])[0];
    const firstAlt = norm(r["First Names"])[0];
    const last = norm(r["Surname"]).slice(-1)[0];
    const hits = users.filter((u) => {
      const t = norm(u.name);
      return (t[0] === first || t[0] === firstAlt) && (t.includes(last) || t[t.length - 1] === last);
    });
    const start = excelDate(r["Start"]);
    const fin = excelDate(r["Finish"]);
    console.log(
      `${String(r["Id"]).padStart(3)} ${(r["First Names"] + " " + r["Surname"]).padEnd(32)} | ${String(r["Job Title"] ?? "").padEnd(26)} | ${String(r["Active"]).padEnd(8)} | start ${start?.toISOString().slice(0, 10) ?? "-"} fin ${fin?.toISOString().slice(0, 10) ?? "-"} | prop=${r["Proprietor"]} | ` +
        (hits.length === 1 ? `-> ${hits[0].name} [${hits[0].role}${hits[0].isSuperUser ? ", SUPER" : ""}] ${hits[0].email}` : hits.length ? `AMBIGUOUS (${hits.map((h) => h.name).join(" / ")})` : "NO APP USER") +
        ` | emailInSheet=${r["Email"] ?? "-"}`,
    );
  }
} finally {
  await p.$disconnect();
}
