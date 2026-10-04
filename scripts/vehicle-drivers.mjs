import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try {
  const vs = await p.vehicle.findMany({ include: { assignedToUser: true }, orderBy: { name: "asc" } });
  for (const v of vs) {
    const u = v.assignedToUser;
    console.log(`${v.name.padEnd(28)} ${u ? `${u.name} <${u.email}> ${u.isActive ? "" : "(INACTIVE)"}` : "** NO DRIVER **"}`);
  }
  console.log(`\n${vs.length} vehicles, ${vs.filter((v) => v.assignedToUser?.isActive).length} will receive the monthly check`);
} finally {
  await p.$disconnect();
}
