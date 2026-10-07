// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Creates a TEST installer login so someone can sign in (e.g. on a phone) and see exactly what installers see, and books them on TEST001.
//   node scripts/create-test-installer.mjs <email> "<display name>"
// The password is random and never shown — the person sets their own via the invite email (Settings > Users > Send invite).
// Field staff are always limited to the Installers + Communications sections.
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { randomBytes } from "crypto";

const email = (process.argv[2] ?? "jo@jtbc.co.nz").trim().toLowerCase();
const name = process.argv[3] ?? "Installer test";
const p = new PrismaClient();
try {
  let u = await p.user.findUnique({ where: { email } });
  if (!u) {
    const passwordHash = await hash(randomBytes(24).toString("base64url"), { memoryCost: 19456, timeCost: 2, parallelism: 1 });
    u = await p.user.create({ data: { name, email, passwordHash, role: "SENIOR_INSTALLER", isSuperUser: false, isActive: true, mustResetPassword: true, permissions: ["Installers", "Communications"] } });
    const jo = await p.user.findUnique({ where: { email: "jo@aliframe.co.nz" }, select: { id: true } });
    await p.auditLog.create({ data: { userId: jo?.id ?? u.id, action: "user_created", entityType: "User", entityId: u.id, metadata: { createdEmail: email, role: "SENIOR_INSTALLER", purpose: "installer view test login" } } });
    console.log("Created", u.name, u.email, u.role);
  } else console.log("Already exists:", u.name, u.role, "active:", u.isActive);
  // book on the test job so there is something to see
  const task = await p.jobScheduledTask.findFirst({ where: { jobNumber: "TEST001", type: "Installation" }, select: { id: true } });
  if (task) { await p.jobScheduledTask.update({ where: { id: task.id }, data: { assignees: { connect: [{ id: u.id }] } } }); console.log("Booked on TEST001"); }
} catch (e) { console.log("ERR", String(e.message).split("\n").slice(-2).join(" ")); } finally { await p.$disconnect(); }
