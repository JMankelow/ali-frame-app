// Usage: node scripts/who-has-assets.mjs siauane
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try {
  const q = process.argv[2] ?? "";
  const user = await p.user.findFirst({ where: { name: { contains: q, mode: "insensitive" } }, include: { vehiclesDriven: true } });
  console.log("user:", user?.name, user?.id, " vehicles:", user?.vehiclesDriven.map((v) => v.name).join(", "));
  const total = await p.asset.count();
  const byStatus = await p.asset.groupBy({ by: ["status"], _count: true });
  console.log("all assets:", total, JSON.stringify(byStatus));
  const groups = await p.asset.groupBy({ by: ["assignedToUserId"], _count: true });
  const users = await p.user.findMany({ select: { id: true, name: true } });
  for (const g of groups) console.log("  assigned to", (users.find((u) => u.id === g.assignedToUserId)?.name ?? (g.assignedToUserId ? "(unknown user)" : "(nobody)")).padEnd(34), g._count);
  const vg = await p.asset.groupBy({ by: ["assignedToVehicleId"], _count: true });
  const vehicles = await p.vehicle.findMany({ select: { id: true, name: true } });
  for (const g of vg) console.log("  on vehicle  ", (vehicles.find((v) => v.id === g.assignedToVehicleId)?.name ?? "(none)").padEnd(34), g._count);
  const named = await p.asset.findMany({ where: { OR: [{ description: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }, { receiptNote: { contains: q, mode: "insensitive" } }] }, select: { name: true, description: true, assignedToUserId: true, assignedToVehicleId: true, status: true } });
  console.log("assets mentioning", q, ":", named.length);
  for (const a of named.slice(0, 15)) console.log("   ", a.name, "|", a.description ?? "", "|", a.status);
  if (user) {
    const mine = await p.asset.count({ where: { status: "Active", OR: [{ assignedToUserId: user.id }, { assignedToVehicle: { assignedToUserId: user.id } }] } });
    console.log(`what ${user.name} sees on My Assets now:`, mine);
  }
} finally {
  await p.$disconnect();
}
