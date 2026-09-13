import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SiteMeasureSheet } from "./SiteMeasureSheet";

export default async function SiteMeasurePage() {
  await requireUser();

  const jobs = await prisma.job.findMany({
    where: { archived: false },
    orderBy: { createdAt: "desc" },
    select: {
      number: true,
      title: true,
      address: true,
      supplier: true,
      client: { select: { name: true, phone: true, email: true } },
    },
  });

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Site Measure</h2>
          <div className="subtitle">Freehand measure sheets, uploaded to the job's files and emailed to the supplier.</div>
        </div>
      </div>
      <SiteMeasureSheet jobs={jobs} />
    </div>
  );
}
