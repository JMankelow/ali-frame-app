import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const vehicles = await prisma.vehicle.findMany({ select: { name: true, rego: true, assignedToUserId: true } });
console.log("VEHICLES:", JSON.stringify(vehicles, null, 2));

const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, role: true } });
console.log("USERS:", JSON.stringify(users, null, 2));

await prisma.$disconnect();
