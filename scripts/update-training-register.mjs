// Updates the H&S Training & Qualifications register from the Site Safe learner profiles and BCITO certificates
// Jo supplied on 5 Oct 2026 (Site safe.zip / BCITO (1).zip). Run: node scripts/update-training-register.mjs [--apply]
import { PrismaClient } from "@prisma/client";

const apply = process.argv.includes("--apply");

// Site Safe: ssid, expiry, learning history (from each learner profile). Matched on the register's name.
const SITESAFE = {
  "Kere Taaka Tekaute": { ssid: "908885", expiry: "2028-07-16", card: "Passport Plus – Flexi" },
  "Tristam Kingi": { ssid: "908888", expiry: "2028-02-19", card: "Passport Plus – Flexi" },
  "Amanaki Fukofuka": { ssid: "386396", expiry: "2028-02-19", card: "Passport Plus – Flexi; Building Construction Passport" },
  "Jake Iakopo": { ssid: "537048", expiry: "2028-02-19", card: "Passport Plus – Flexi; Building Construction Passport" },
  "Aisea Fifita": { ssid: "883827", expiry: "2027-02-27", card: "Passport Plus – Flexi; Foundation Passport – Building Construction" },
  "Siauane Siauane": { ssid: "908889", expiry: "2028-07-16", card: "Passport Plus – Flexi" },
  "Gulio Afu": { ssid: "520388", expiry: "2028-02-19", card: "Passport Plus – Flexi; Building Construction Passport" },
  "Tapu Veainu": { ssid: "926861", expiry: "2027-10-09", card: "Passport Plus – Flexi; Foundation Passport – Building Construction" },
  "Fale Veainu": { ssid: "1070484", expiry: "2027-10-09", card: "Passport Plus – Flexi" },
  "Matt Batey": { ssid: "1070483", expiry: "2027-10-09", card: "Passport Plus – Flexi" },
  "Ceejay Terite": { ssid: "1070482", expiry: "2027-10-09", card: "Passport Plus – Flexi" },
  "Ryan Kopara": { ssid: "1021224", expiry: "2028-07-16", card: "Passport Plus – Flexi; Foundation Passport – Building Construction" },
  "Issac Folau": { ssid: "534063", expiry: "2028-07-16", card: "Passport Plus – Flexi; Foundation Passport – Building Construction; Building Construction Passport" },
};

// BCITO: NZ Certificate in Architectural Aluminium Joinery (Installer) (Level 4), awarded date + NSN.
const BCITO = {
  "Tristam Kingi": { awarded: "31 Aug 2022", nsn: "114-424-832" },
  "Amanaki Fukofuka": { awarded: "13 Nov 2023", nsn: "123-279-609" },
  "Jake Iakopo": { awarded: "26 Jun 2025", nsn: "116-851-345" },
  "Aisea Fifita": { awarded: "26 Jun 2025", nsn: "126-916-438" },
  "Siauane Siauane": { awarded: "26 Jun 2025", nsn: "108-385-886" }, // certificate issued as "Siauane Lio"
};

const p = new PrismaClient();
try {
  const rows = await p.hsCompetency.findMany({ where: { active: true } });
  for (const r of rows) {
    const ss = SITESAFE[r.name];
    const bc = BCITO[r.name];
    if (!ss && !bc) continue;

    // Keep the other qualifications already on file (First Aid, EWP, AAAJ, LBP, apprenticeships…); only the wording the
    // new documents replace is swapped. Split on " - " or ", " but not inside number lists like "EWP 17600, 25045".
    const existing = (r.qualifications ?? "").split(/\s+-\s+|,\s+(?=[A-Za-z])/).map((q) => q.trim()).filter(Boolean);
    const kept = existing.filter((q) => !(ss && /^site safe/i.test(q)) && !(bc && /^bcito/i.test(q)));
    const parts = [
      ss ? `Site Safe: ${ss.card} (card expires ${ss.expiry.split("-").reverse().join("/")})` : "",
      bc ? `NZ Certificate in Architectural Aluminium Joinery (Installer) (Level 4), BCITO — awarded ${bc.awarded}, NSN ${bc.nsn}` : "",
      ...kept,
    ].filter(Boolean);
    const next = { siteSafeNumber: ss?.ssid ?? r.siteSafeNumber, expiryDate: ss ? new Date(`${ss.expiry}T12:00:00.000Z`) : r.expiryDate, qualifications: parts.join(" · ") };

    const changed = next.siteSafeNumber !== r.siteSafeNumber || +(next.expiryDate ?? 0) !== +(r.expiryDate ?? 0) || next.qualifications !== r.qualifications;
    if (!changed) continue;
    console.log(`${apply ? "UPDATE" : "would "} ${r.name}\n    SSID ${r.siteSafeNumber ?? "-"} → ${next.siteSafeNumber}; expiry ${r.expiryDate?.toISOString().slice(0, 10) ?? "-"} → ${next.expiryDate?.toISOString().slice(0, 10)}\n    ${next.qualifications}`);
    if (apply) {
      await p.hsCompetency.update({ where: { id: r.id }, data: next });
      await p.auditLog.create({ data: { action: "hs_competency_updated_from_certificates", entityType: "HsCompetency", entityId: r.id, metadata: { name: r.name, source: "Site Safe profiles + BCITO certificates, 5 Oct 2026" } } });
    }
  }
} finally {
  await p.$disconnect();
}
