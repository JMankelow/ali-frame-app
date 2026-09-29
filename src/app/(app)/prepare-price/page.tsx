import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PrepareForm } from "./PrepareForm";

export default async function PreparePricePage() {
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
          <h2>Prepare Price</h2>
          <div className="subtitle">
            Turn revised figures into an install-pricing PDF and a customer email — a margin adds to the supplier
            price, a discount/credit subtracts.
          </div>
        </div>
      </div>

      <PrepareForm jobs={jobs} />
    </div>
  );
}
