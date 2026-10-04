// Usage: node scripts/who-is.mjs tanya
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try {
  const q = process.argv[2] ?? "";
  const users = await p.user.findMany({ where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } });
  for (const u of users) {
    const sessions = await p.session.count({ where: { userId: u.id } });
    console.log(`${u.name} <${u.email}> role=${u.role} super=${u.isSuperUser} active=${u.isActive} permissions=[${u.permissions.join(", ")}] mustReset=${u.mustResetPassword} sessionsEver=${sessions}`);
  }
  const claude = await p.user.findUnique({ where: { email: "claude@aliframe.local" } });
  console.log("claude assignee user exists:", !!claude);
} finally {
  await p.$disconnect();
}
