// Jo confirmed (2026-09-28) only these 5 are real Senior Installers: Aisea
// Fifita, Amanaki Fukofuka, Gulio Folauola Puniani Afu, Jake Iakopo, Siauane
// Siauane. The rest, added from the SharePoint folder listing without a real
// seniority tier, get downgraded to Intermediate — Jo can fine-tune
// Junior vs Intermediate per person from Users herself.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const NOT_SENIOR = [
  "Carl Terite",
  "Gabriel Tu'a",
  "Issac Folau",
  "Kaumea Fafale Taemangi SioSiuafale",
  "Kayden Tyler-Taaka Tekaute",
  "Khaled Totua-Iakopo",
  "Ryan Kopara",
];

async function main() {
  let updated = 0;
  for (const name of NOT_SENIOR) {
    const user = await prisma.user.findFirst({ where: { name, role: "SENIOR_INSTALLER" } });
    if (!user) {
      console.log(`Skipped ${name} — not found or already changed.`);
      continue;
    }
    await prisma.user.update({ where: { id: user.id }, data: { role: "INTERMEDIATE_INSTALLER" } });
    updated += 1;
  }
  console.log(`Downgraded ${updated} accounts to Intermediate Installer.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
