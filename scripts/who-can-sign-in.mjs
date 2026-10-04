import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try {
  const users = await p.user.findMany({
    where: { isActive: true, email: { not: { endsWith: ".local" } } },
    select: { name: true, email: true, isSuperUser: true, mustResetPassword: true, _count: { select: { sessions: true } } },
    orderBy: { name: "asc" },
  });
  const sessions = await p.session.count({ where: { expiresAt: { gt: new Date() } } });
  for (const u of users) {
    console.log(`${u.name.padEnd(36)} super=${u.isSuperUser ? "Y" : "n"}  ownPasswordSet=${u.mustResetPassword ? "NO (can't sign in)" : "YES (can sign in)"}  sessionsEver=${u._count.sessions}`);
  }
  console.log("Currently valid sessions:", sessions);
} finally {
  await p.$disconnect();
}
