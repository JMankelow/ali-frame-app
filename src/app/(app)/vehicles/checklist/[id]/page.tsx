// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { MonthlyChecklistForm } from "./MonthlyChecklistForm";
import { MONTHLY_QUESTIONS, isFailure, parseMonthlyResponses } from "@/lib/vehicleChecklist";

const iso = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

export default async function MonthlyChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const checklist = await prisma.vehicleChecklist.findUnique({ where: { id }, include: { vehicle: true, assignedTo: true } });
  if (!checklist || checklist.template !== "monthly") notFound();
  if (checklist.assignedToId !== user.id && !user.isSuperUser) notFound();

  const done = checklist.status === "Completed";
  const r = parseMonthlyResponses(checklist.responses);

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Monthly Vehicle Check — {checklist.vehicle.name}</h2>
          <div className="subtitle">
            {checklist.assignedTo.name} · due {checklist.dueDate.toLocaleDateString("en-NZ")} ·{" "}
            <span className={`status ${done ? "green" : "orange"}`}>{done ? "Completed" : "Pending"}</span>
          </div>
        </div>
        <Link href={`/vehicles/${encodeURIComponent(checklist.vehicle.name)}`} className="btn light">
          ← {checklist.vehicle.name}
        </Link>
      </div>

      {!done && (
        <MonthlyChecklistForm
          checklistId={checklist.id}
          vehicleName={checklist.vehicle.name}
          operatorName={checklist.assignedTo.name}
          signerName={user.name}
          defaults={{
            date: new Date().toISOString().slice(0, 10),
            wofExpiry: iso(checklist.vehicle.wofDueDate),
            regoExpiry: iso(checklist.vehicle.regoDueDate),
            serviceDate: iso(checklist.vehicle.lastServiceDate),
            lastOdometerKm: checklist.vehicle.currentOdometerKm,
          }}
        />
      )}

      {done && r && (
        <div className="card">
          <div className="hint">
            Signed by {r.signedBy} on {new Date(r.signedAt).toLocaleString("en-NZ")} · Odometer {r.odometerKm.toLocaleString()} km · WOF {r.wofExpiry} · Rego {r.regoExpiry} · Last service {r.serviceDate}
            {r.serviceKms ? ` @ ${r.serviceKms}` : ""}
          </div>
          <table style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>Question</th>
                <th>Answer</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {MONTHLY_QUESTIONS.map((q) => {
                const a = r.answers[q.key];
                const failed = a && isFailure(q, a.answer);
                return (
                  <tr key={q.key}>
                    <td>{q.text}</td>
                    <td>
                      <span className={`status ${failed ? "red" : "green"}`}>{a?.answer ?? "—"}</span>
                    </td>
                    <td>{a?.reason || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {done && !r && <div className="card hint">This check was completed without structured answers.</div>}
    </div>
  );
}
