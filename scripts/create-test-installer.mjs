// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Creates a TEST installer login for Jo (jo@jtbc.co.nz) so she can sign in on her phone and see exactly what installers see.
// The password is random and never shown — Jo sets her own via the invite email (Settings > Users > Invite).
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { randomBytes } from "crypto";

const p = new PrismaClient();
try {
  const email = "jo@jtbc.co.nz";
  const existing = await p.user.findUnique({ where: { email } });
  if (existing) { console.log("Already exists:", existing.name, existing.role, "active:", existing.isActive); process.exit(0); }
  const passwordHash = await hash(randomBytes(24).toString("base64url"), { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const u = await p.user.create({ data: { name: "Jo (Installer test)", email, passwordHash, role: "SENIOR_INSTALLER", isSuperUser: false, isActive: true, mustResetPassword: true } });
  const jo = await p.user.findUnique({ where: { email: "jo@aliframe.co.nz" }, select: { id: true } });
  await p.auditLog.create({ data: { userId: jo?.id ?? u.id, action: "user_created", entityType: "User", entityId: u.id, metadata: { createdEmail: email, role: "SENIOR_INSTALLER", purpose: "installer view test login for Jo" } } });
  console.log("Created", u.name, u.email, u.role);
} catch (e) { console.log("ERR", String(e.message).split("\n").slice(-2).join(" ")); } finally { await p.$disconnect(); }
