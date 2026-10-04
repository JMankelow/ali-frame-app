// The 21 real install dates imported from the Job Tracking spreadsheet lived in
// Job.startDate, which the rebuilt Calendar no longer reads. Converts each into
// a real Installation booking so it shows on the Calendar and can be edited.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
try {
  const jo = await prisma.user.findFirst({ where: { isSuperUser: true, email: "jo@aliframe.co.nz" } });
  if (!jo) throw new Error("Jo's account not found");
  const jobs = await prisma.job.findMany({ where: { startDate: { not: null }, archived: false }, include: { client: true } });
  let created = 0, skipped = 0;
  for (const j of jobs) {
    const existing = await prisma.jobScheduledTask.findFirst({ where: { jobNumber: j.number, type: "Installation" } });
    if (existing) { skipped += 1; continue; }
    await prisma.jobScheduledTask.create({
      data: { jobNumber: j.number, type: "Installation", scheduledDate: j.startDate, status: "Booked in", notes: "Imported from Job Tracking install date", createdById: jo.id },
    });
    created += 1;
  }
  console.log(`Jobs with an install date: ${jobs.length}. Bookings created: ${created}. Already had one: ${skipped}.`);
} finally {
  await prisma.$disconnect();
}
