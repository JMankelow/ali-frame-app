// Corrects the login email of people who have NOT signed in yet to the email in the payroll data (EmployeeDetail.personalEmail).
// Left alone on purpose: company mailboxes used by the app itself (jo@, tanya@, dwayne@) and anyone who has already signed in
// (changing their login would lock them out). Usage: node scripts/fix-user-emails.mjs [--apply]
import { PrismaClient } from "@prisma/client";
const apply = process.argv.includes("--apply");
const KEEP = new Set(["jo@aliframe.co.nz", "tanya@aliframe.co.nz", "dwayne@aliframe.co.nz"]);
const p = new PrismaClient();
try {
  const us = await p.user.findMany({ where: { isActive: true }, select: { id: true, name: true, email: true, employeeDetail: { select: { personalEmail: true } }, _count: { select: { sessions: true } } } });
  const used = new Set((await p.inviteToken.findMany({ where: { usedAt: { not: null } }, select: { userId: true } })).map((t) => t.userId));
  const taken = new Set(us.map((u) => u.email.toLowerCase()));
  const planned = new Set();
  for (const u of us) {
    const target = u.employeeDetail?.personalEmail?.trim().toLowerCase();
    let why = "";
    if (KEEP.has(u.email)) why = "company mailbox used by the app";
    else if (u._count.sessions > 0 || used.has(u.id)) why = "has already signed in";
    else if (!target) why = "no payroll email";
    else if (target === u.email) why = "already correct";
    else if ((taken.has(target) && target !== u.email) || planned.has(target)) why = "that email is already used by another account";
    if (why) { console.log(`skip   ${u.name.padEnd(30)} ${u.email}  (${why})`); continue; }
    planned.add(target);
    console.log(`${apply ? "UPDATE" : "would "} ${u.name.padEnd(30)} ${u.email}  ->  ${target}`);
    if (apply) {
      await p.user.update({ where: { id: u.id }, data: { email: target } });
      await p.auditLog.create({ data: { action: "user_email_corrected", entityType: "User", entityId: u.id, metadata: { from: u.email, to: target, source: "payroll data" } } });
    }
  }
} finally {
  await p.$disconnect();
}
