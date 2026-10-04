import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const prefixes = process.argv.slice(2);
try {
  const claude = await p.user.findUnique({ where: { email: "claude@aliframe.local" } });
  for (const prefix of prefixes) {
    const r = await p.note.updateMany({
      where: { assignedToId: claude.id, status: { not: "Done" }, text: { startsWith: prefix } },
      data: { status: "Done", resolvedAt: new Date() },
    });
    console.log(prefix, "->", r.count);
  }
} finally {
  await p.$disconnect();
}
