import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SiteMeasureSheet } from "./SiteMeasureSheet";

export default async function SiteMeasurePage() {
  await requireUser();

  const [jobs, suppliers, templates] = await Promise.all([
    prisma.job.findMany({
      where: { archived: false },
      orderBy: { createdAt: "desc" },
      select: {
        number: true,
        title: true,
        address: true,
        supplier: true,
        client: { select: { name: true, phone: true, email: true } },
      },
    }),
    prisma.supplier.findMany({ select: { companyName: true, contactName: true, email: true } }),
    prisma.emailTemplate.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, subject: true, body: true } }),
  ]);

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Site Measure</h2>
          <div className="subtitle">Freehand measure sheets, uploaded to the job's files and emailed to the supplier.</div>
        </div>
      </div>
      <SiteMeasureSheet jobs={jobs} suppliers={suppliers} templates={templates} />
    </div>
  );
}
