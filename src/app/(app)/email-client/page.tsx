import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { BookCheckMeasureForm } from "./BookCheckMeasureForm";

export default async function EmailClientPage() {
  await requireUser();

  const jobs = await prisma.job.findMany({
    where: { archived: false },
    orderBy: { number: "asc" },
    select: { number: true, title: true },
  });

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Email Client</h2>
          <div className="subtitle">
            Send the client the "book your final check measure" email once their deposit's in.
          </div>
        </div>
      </div>

      <BookCheckMeasureForm jobs={jobs} />
    </div>
  );
}
