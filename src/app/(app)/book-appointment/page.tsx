// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { requireNotInstaller } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { BookAppointmentForm } from "./BookAppointmentForm";

export default async function BookAppointmentPage() {
  await requireNotInstaller();

  const [jobs, people] = await Promise.all([
    prisma.job.findMany({
      where: { archived: false },
      orderBy: { number: "desc" },
      select: { number: true, title: true, email: true, address: true, client: { select: { email: true, name: true } } },
    }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  // Measure appointments are only ever done by Kere, Tristam or Dwayne.
  const staff = people.filter((p) => ["kere", "tristam", "dwayne"].some((n) => p.name.toLowerCase().includes(n)));

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Book Appointment</h2>
          <div className="subtitle">Book a sales measure or check measure — it goes on the Calendar and the client is emailed to confirm.</div>
        </div>
      </div>
      <BookAppointmentForm
        jobs={[...jobs].sort((a, b) => Number(b.number) - Number(a.number)).map((j) => ({ number: j.number, title: j.client?.name ?? j.title, email: j.client?.email ?? j.email, address: j.address }))}
        staff={staff}
      />
    </div>
  );
}
