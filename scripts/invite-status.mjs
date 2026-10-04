// Usage: node scripts/invite-status.mjs tristam   -> shows every invite link ever issued to that person and its state
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try {
  const q = process.argv[2] ?? "";
  const users = await p.user.findMany({ where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } });
  for (const u of users) {
    const tokens = await p.inviteToken.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" } });
    console.log(`${u.name} <${u.email}> active=${u.isActive} mustResetPassword=${u.mustResetPassword}`);
    const now = Date.now();
    for (const t of tokens) {
      const state = t.usedAt ? `USED ${t.usedAt.toISOString()}` : t.expiresAt.getTime() < now ? "EXPIRED" : "valid";
      console.log(`   issued ${t.createdAt.toISOString()}  expires ${t.expiresAt.toISOString()}  -> ${state}`);
    }
    if (!tokens.length) console.log("   (no invites issued)");
    const audits = await p.auditLog.findMany({ where: { action: "user_invite_sent", entityId: u.id }, orderBy: { createdAt: "desc" }, take: 5 });
    for (const a of audits) console.log(`   audit: invite emailed ${a.createdAt.toISOString()} to ${JSON.stringify(a.metadata)}`);
  }
  console.log("APP_URL env:", process.env.APP_URL ?? "(not set locally)");
} finally {
  await p.$disconnect();
}
