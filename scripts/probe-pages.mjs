import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const probes = {
  estimates: () => p.estimate.findMany({ orderBy: { dateReceived: "desc" } }),
  jobs: () => p.job.findMany({ take: 5 }),
  users: () => p.user.findMany({ take: 5 }),
  vehicles: () => p.vehicle.findMany({ include: { assignedToUser: true, issues: true } }),
  checklists: () => p.vehicleChecklist.findMany({ take: 5 }),
  hsDocs: () => p.hsDocument.findMany(),
  hsRisks: () => p.hsRisk.findMany(),
  incidents: () => p.safetyIncident.findMany({ include: { reportedBy: true } }),
};
try {
  for (const [name, fn] of Object.entries(probes)) {
    const t = Date.now();
    try {
      const r = await fn();
      console.log(`OK    ${name.padEnd(12)} ${r.length} rows  ${Date.now() - t}ms`);
    } catch (e) {
      console.log(`FAIL  ${name.padEnd(12)} ${String(e.message).split("\n").filter(Boolean).slice(-3).join(" | ")}`);
    }
  }
  // repeat one query to spot connection drops
  for (let i = 0; i < 5; i++) {
    const t = Date.now();
    try { await p.estimate.count(); console.log(`ping ${i} ok ${Date.now() - t}ms`); } catch (e) { console.log(`ping ${i} FAIL ${String(e.message).split("\n").pop()}`); }
  }
} finally {
  await p.$disconnect();
}
