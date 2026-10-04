import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const now = new Date();
const som = new Date(now.getFullYear(), now.getMonth(), 1);
const dow = (now.getDay() + 6) % 7;
const sow = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
try {
  console.log("window: month from", som.toISOString().slice(0, 10), " week from", sow.toISOString().slice(0, 10));
  console.log("costing total rows:", await p.jobCosting.count(), " with dateAccepted:", await p.jobCosting.count({ where: { dateAccepted: { not: null } } }));
  const accM = await p.jobCosting.aggregate({ where: { dateAccepted: { gte: som } }, _sum: { quotedTotal: true }, _count: true });
  console.log("accepted this month (costing):", accM._count, accM._sum.quotedTotal);
  const lastAcc = await p.jobCosting.findMany({ where: { dateAccepted: { not: null } }, orderBy: { dateAccepted: "desc" }, take: 3, select: { jobNumber: true, dateAccepted: true, quotedTotal: true } });
  console.log("latest accepted:", JSON.stringify(lastAcc));
  console.log("quotes: total", await p.quote.count(), " sent this week:", await p.quote.count({ where: { dateSent: { gte: sow } } }), " this month:", await p.quote.count({ where: { dateSent: { gte: som } } }));
  console.log("quote statuses:", JSON.stringify(await p.quote.groupBy({ by: ["status"], _count: true })));
  console.log("quotes accepted w/ quoteDate this month:", await p.quote.count({ where: { status: "Accepted", quoteDate: { gte: som } } }));
  console.log("remedial total:", await p.remedialItem.count(), " this month:", await p.remedialItem.count({ where: { createdAt: { gte: som } } }), " costing remedialFlag:", await p.jobCosting.count({ where: { remedialFlag: true } }));
  console.log("job statuses:", JSON.stringify(await p.job.groupBy({ by: ["status"], where: { archived: false }, _count: true })));
  console.log("completed transitions (audit) this month:", (await p.auditLog.findMany({ where: { action: "job_updated", createdAt: { gte: som } }, select: { metadata: true } })).filter((a) => a.metadata?.statusTo === "Completed").length);
  console.log("scheduled task types:", JSON.stringify(await p.jobScheduledTask.groupBy({ by: ["type"], _count: true })));
  console.log("PO statuses:", JSON.stringify(await p.purchaseOrder.groupBy({ by: ["status"], _count: true })));
  console.log("completed jobs with costing hours:", await p.job.count({ where: { status: "Completed", costing: { labourHoursQuoted: { not: null }, labourHoursActual: { not: null } } } }));
} finally {
  await p.$disconnect();
}
