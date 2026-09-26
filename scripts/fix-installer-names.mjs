// Real installer roster, transcribed from Jo's SharePoint folder listing
// (2026-09-26) — full legal names to replace the nickname-only accounts
// created earlier this session, plus the installers not yet in the system.
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();
const ARGON2_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

// existing nickname -> real full name
const RENAMES = {
  Fita: "Aisea Fifita",
  Siauane: "Siauane Siauane",
  Naki: "Amanaki Fukofuka",
  Gulio: "Gulio Folauola Puniani Afu",
  Tapu: "Siosiuafale Hauhautapu",
  Matt: "Matthew Batey",
  Jake: "Jake Iakopo",
};

// not yet in the system — created here, matching the existing installer
// account convention (SENIOR_INSTALLER, firstname@aliframe.co.nz where that's
// unambiguous, mustResetPassword, no invite sent).
const NEW_INSTALLERS = [
  { name: "Issac Folau", email: "issac@aliframe.co.nz" },
  { name: "Kaumea Fafale Taemangi SioSiuafale", email: "kaumea@aliframe.co.nz" },
  { name: "Kayden Tyler-Taaka Tekaute", email: "kayden@aliframe.co.nz" },
  { name: "Khaled Totua-Iakopo", email: "khaled@aliframe.co.nz" },
  { name: "Ryan Kopara", email: "ryan@aliframe.co.nz" },
  { name: "Carl Terite", email: "carl@aliframe.co.nz" },
  { name: "Gabriel Tu'a", email: "gabriel@aliframe.co.nz" },
];

async function main() {
  let renamed = 0;
  for (const [nickname, fullName] of Object.entries(RENAMES)) {
    const user = await prisma.user.findFirst({ where: { name: nickname } });
    if (!user) {
      console.log(`No user found for nickname "${nickname}" — skipped.`);
      continue;
    }
    await prisma.user.update({ where: { id: user.id }, data: { name: fullName } });
    renamed += 1;
  }
  console.log(`Renamed ${renamed} installer accounts to full names.`);

  let created = 0;
  for (const { name, email } of NEW_INSTALLERS) {
    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) {
      console.log(`Skipped ${name} — account already exists.`);
      continue;
    }
    const tempPassword = randomBytes(12).toString("base64url");
    const passwordHash = await hash(tempPassword, ARGON2_OPTIONS);
    await prisma.user.create({
      data: { name, email, passwordHash, role: "SENIOR_INSTALLER", mustResetPassword: true },
    });
    created += 1;
  }
  console.log(`Created ${created} new installer accounts (temp passwords not sent).`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
