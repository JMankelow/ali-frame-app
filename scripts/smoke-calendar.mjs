import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const DAY = 86400000;
const results = [];
async function run(name, fn) {
  try {
    const r = await fn();
    results.push(`OK    ${name} (${Array.isArray(r) ? r.length + " rows" : "ok"})`);
  } catch (e) {
    results.push(`FAIL  ${name}: ${String(e.message).split("\n").filter(Boolean).slice(-3).join(" | ")}`);
  }
}
try {
  const now = new Date();
  const gridStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const gridEnd = new Date(now.getFullYear(), now.getMonth() + 2, 1);
  await run("calendar: scheduled tasks (month view window)", () =>
    prisma.jobScheduledTask.findMany({
      where: { type: { in: ["Installation", "Check Measure", "Sales Measure", "Remedial"] }, scheduledDate: { lt: gridEnd }, OR: [{ endDate: null, scheduledDate: { gte: gridStart } }, { endDate: { gte: gridStart } }] },
      include: { job: { include: { client: true } }, assignees: true },
    }));
  await run("calendar: staff leave", () =>
    prisma.staffLeave.findMany({ where: { fromDate: { lt: gridEnd }, OR: [{ toDate: null, fromDate: { gte: gridStart } }, { toDate: { gte: gridStart } }] }, include: { staff: true } }));
  await run("calendar: vehicles", () => prisma.vehicle.findMany({ select: { name: true, wofDueDate: true, regoDueDate: true, serviceDueDate: true } }));
  await run("calendar: checklists", () => prisma.vehicleChecklist.findMany({ where: { status: { not: "Completed" }, dueDate: { gte: gridStart, lt: gridEnd } }, select: { dueDate: true, vehicle: { select: { name: true } } } }));
  await run("calendar: staff list", () => prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true } }));
  await run("jobs list (with client)", () => prisma.job.findMany({ take: 50, include: { client: true } }));
  await run("job detail (full include set)", async () => {
    const j = await prisma.job.findFirst({ select: { number: true } });
    return prisma.job.findUnique({ where: { number: j.number }, include: { client: true, assignedUser: true, costing: true, scheduledTasks: { include: { assignees: true } }, notes: true, quotes: true, purchaseOrders: true, quoteInputs: true } });
  });
  await run("estimates", () => prisma.estimate.findMany({ take: 20 }));
  await run("quotes", () => prisma.quote.findMany({ take: 20 }));
  await run("vehicles + maintenance", () => prisma.vehicle.findMany({ include: { maintenanceRecords: { take: 3 }, assets: { take: 3 } } }));
  await run("assets", () => prisma.asset.findMany({ take: 20, include: { assignedToUser: true, assignedToVehicle: true } }));
  await run("employees", () => prisma.user.findMany({ include: { vehiclesDriven: true } }));
  await run("dashboard counts", () => Promise.all([prisma.job.count(), prisma.lead.count(), prisma.remedialItem.count(), prisma.note.count()]));
  await run("users page (permissions + tasks)", () => prisma.user.findMany({ select: { permissions: true, role: true, isSuperUser: true, mustResetPassword: true } }));
} finally {
  console.log(results.join("\n"));
  await prisma.$disconnect();
}
