import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const users = await prisma.user.findMany({
  select: { name: true, email: true, role: true, isSuperUser: true, isActive: true, permissions: true },
  orderBy: { createdAt: "asc" },
});
console.log(JSON.stringify(users, null, 2));

await prisma.$disconnect();
