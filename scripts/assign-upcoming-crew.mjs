// Adds every active installer (by role) plus Tanya and Tristam as allocated people on every UPCOMING booking.
//   node scripts/assign-upcoming-crew.mjs [--dry-run]
// Upcoming = not cancelled/completed and still running today or later. Adds people only — never removes anyone.
import { PrismaClient } from "@prisma/client";
const DRY = process.argv.includes("--dry-run");
const p = new PrismaClient();
const INSTALLER_ROLES = ["SENIOR_INSTALLER", "INTERMEDIATE_INSTALLER", "JUNIOR_INSTALLER", "CREW_MOBILE", "CONTRACTOR"];
try {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const crew = await p.user.findMany({
    where: {
      isActive: true,
      email: { not: "claude@aliframe.local" },
      OR: [{ role: { in: INSTALLER_ROLES } }, { email: { in: ["tanya@aliframe.co.nz", "tristam@aliframe.co.nz"] } }],
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });
  console.log(`Crew to allocate (${crew.length}):`);
  crew.forEach((u) => console.log(`   ${u.name.padEnd(34)} ${u.role}`));

  const tasks = await p.jobScheduledTask.findMany({
    where: {
      status: { notIn: ["Cancelled", "Completed"] },
      OR: [{ scheduledDate: { gte: startOfToday } }, { endDate: { gte: startOfToday } }],
    },
    include: { assignees: { select: { id: true } }, job: { select: { number: true, title: true } } },
    orderBy: { scheduledDate: "asc" },
  });
  console.log(`\nUpcoming bookings: ${tasks.length}`);

  let added = 0;
  for (const t of tasks) {
    const have = new Set(t.assignees.map((a) => a.id));
    const missing = crew.filter((u) => !have.has(u.id));
    if (!missing.length) continue;
    added += missing.length;
    console.log(`  ${t.scheduledDate.toISOString().slice(0, 10)} ${t.type.padEnd(14)} ${t.job.number} ${t.job.title.slice(0, 28).padEnd(28)} +${missing.length}`);
    if (!DRY) await p.jobScheduledTask.update({ where: { id: t.id }, data: { assignees: { connect: missing.map((u) => ({ id: u.id })) } } });
  }
  console.log(`\n${DRY ? "Would add" : "Added"} ${added} allocations across ${tasks.length} bookings.`);
} finally {
  await p.$disconnect();
}
