// Real vehicle-to-driver mapping Jo pasted directly from her fleet screenshot
// (2026-09-26): QCA761-Naki, LBA717-Gulio, GUN697-Tristam, PUR16-Jake,
// KEA545-Siauane, PWU811-Fita. Tristam has no user account yet — created
// here, matching the other installer accounts' convention.
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();
// Matches src/lib/password.ts's ARGON2_OPTIONS exactly.
const ARGON2_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

const MAP = {
  QCA761: "Naki",
  LBA717: "Gulio",
  GUN697: "Tristam",
  PUR16: "Jake",
  KEA545: "Siauane",
  PWU811: "Fita",
};

async function main() {
  let tristam = await prisma.user.findFirst({ where: { name: "Tristam" } });
  if (!tristam) {
    const tempPassword = randomBytes(12).toString("base64url");
    const passwordHash = await hash(tempPassword, ARGON2_OPTIONS);
    tristam = await prisma.user.create({
      data: {
        name: "Tristam",
        email: "tristam@aliframe.co.nz",
        passwordHash,
        role: "ADMIN_MANAGEMENT",
        mustResetPassword: true,
      },
    });
    console.log("Created Tristam user account (temp password not sent, matches existing convention).");
  }

  for (const [rego, driverName] of Object.entries(MAP)) {
    const user = driverName === "Tristam" ? tristam : await prisma.user.findFirst({ where: { name: driverName } });
    if (!user) {
      console.log(`Skipped ${rego} — no user found for "${driverName}".`);
      continue;
    }
    const vehicle = await prisma.vehicle.findFirst({ where: { rego } });
    if (!vehicle) {
      console.log(`Skipped ${rego} — no matching vehicle.`);
      continue;
    }
    await prisma.vehicle.update({ where: { id: vehicle.id }, data: { assignedToUserId: user.id } });
    console.log(`Assigned ${rego} -> ${driverName}`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
