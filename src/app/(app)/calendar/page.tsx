import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

interface Event {
  date: Date;
  label: string;
  href: string;
  kind: "Job Due" | "WOF" | "Rego" | "Service" | "Checklist";
}

export default async function CalendarPage() {
  await requireUser();

  const in90Days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  const [jobs, vehicles, checklists] = await Promise.all([
    prisma.job.findMany({ where: { archived: false, dueDate: { not: null, lte: in90Days } }, select: { number: true, title: true, dueDate: true } }),
    prisma.vehicle.findMany({ select: { name: true, wofDueDate: true, regoDueDate: true, serviceDueDate: true } }),
    prisma.vehicleChecklist.findMany({
      where: { status: { not: "Completed" } },
      select: { dueDate: true, vehicle: { select: { name: true } } },
    }),
  ]);

  const events: Event[] = [];
  for (const j of jobs) {
    if (j.dueDate) events.push({ date: j.dueDate, label: `${j.number} — ${j.title}`, href: `/jobs/${j.number}`, kind: "Job Due" });
  }
  for (const v of vehicles) {
    if (v.wofDueDate) events.push({ date: v.wofDueDate, label: v.name, href: `/vehicles/${encodeURIComponent(v.name)}`, kind: "WOF" });
    if (v.regoDueDate) events.push({ date: v.regoDueDate, label: v.name, href: `/vehicles/${encodeURIComponent(v.name)}`, kind: "Rego" });
    if (v.serviceDueDate) events.push({ date: v.serviceDueDate, label: v.name, href: `/vehicles/${encodeURIComponent(v.name)}`, kind: "Service" });
  }
  for (const c of checklists) {
    events.push({ date: c.dueDate, label: c.vehicle.name, href: `/vehicles/${encodeURIComponent(c.vehicle.name)}`, kind: "Checklist" });
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  const today = new Date().toISOString().slice(0, 10);

  const KIND_COLOR: Record<Event["kind"], string> = {
    "Job Due": "blue",
    WOF: "orange",
    Rego: "purple",
    Service: "green",
    Checklist: "grey",
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Calendar</h2>
          <div className="subtitle">Everything due in the next 90 days — job due dates, vehicle warrants and checklists — in one list.</div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>What</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e, i) => {
              const dateStr = e.date.toISOString().slice(0, 10);
              return (
                <tr key={i}>
                  <td style={{ color: dateStr < today ? "#dc2626" : undefined, fontWeight: dateStr < today ? 800 : undefined }}>
                    {e.date.toLocaleDateString("en-NZ")}
                    {dateStr < today ? " (Overdue)" : ""}
                  </td>
                  <td>
                    <span className={`status ${KIND_COLOR[e.kind]}`}>{e.kind}</span>
                  </td>
                  <td>
                    <Link href={e.href} style={{ color: "var(--blueDark)", fontWeight: 800, textDecoration: "none" }}>
                      {e.label}
                    </Link>
                  </td>
                </tr>
              );
            })}
            {events.length === 0 && (
              <tr>
                <td colSpan={3} className="hint">
                  Nothing due in the next 90 days.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
