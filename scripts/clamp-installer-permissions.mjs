// Copyright (c) 2026 BLB Consultants Limited T/A Ali Frame Windows & Doors. All rights reserved.
// One-off + safe to re-run: every field-staff account (installer / crew / contractor) is set to the Installers + Communications sections only,
// and is never a super user.
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try {
  const roles = ["SENIOR_INSTALLER", "INTERMEDIATE_INSTALLER", "JUNIOR_INSTALLER", "CREW_MOBILE", "CONTRACTOR"];
  const users = await p.user.findMany({ where: { role: { in: roles } }, select: { id: true, name: true, permissions: true, isSuperUser: true } });
  let changed = 0;
  for (const u of users) {
    const ok = u.permissions.length === 2 && u.permissions.includes("Installers") && u.permissions.includes("Communications") && !u.isSuperUser;
    if (ok) continue;
    await p.user.update({ where: { id: u.id }, data: { permissions: ["Installers", "Communications"], isSuperUser: false } });
    console.log("fixed", u.name, "was:", JSON.stringify(u.permissions), u.isSuperUser ? "(super user)" : "");
    changed++;
  }
  console.log(`${users.length} field-staff accounts checked, ${changed} corrected`);
} catch (e) { console.log("ERR", String(e.message).split("\n").slice(-2).join(" ")); } finally { await p.$disconnect(); }
