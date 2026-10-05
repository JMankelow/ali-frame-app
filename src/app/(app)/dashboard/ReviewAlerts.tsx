// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import Link from "next/link";
import { prisma } from "@/lib/prisma";

/** Banner on the dashboard when this person has an assessment to complete, a manager assessment waiting, or an outcome to read. */
export async function ReviewAlerts({ userId }: { userId: string }) {
  const [mySelf, myManager, outcomes] = await Promise.all([
    prisma.review360.findMany({ where: { employeeId: userId, status: "Self-assessment pending" }, orderBy: { createdAt: "desc" } }),
    prisma.review360.findMany({ where: { assessorId: userId, status: { not: "Completed" } }, include: { employee: { select: { name: true } }, responses: { select: { role: true, status: true } } } }),
    prisma.review360.findMany({ where: { employeeId: userId, status: "Completed", employeeAckAt: null }, orderBy: { completedAt: "desc" } }),
  ]);
  const toDo = myManager.filter((r) => r.responses.find((x) => x.role === "manager")?.status !== "Submitted");
  if (mySelf.length + toDo.length + outcomes.length === 0) return null;

  const box = { border: "2px solid #0057b8", background: "#eaf4fb", padding: 14, marginBottom: 16, borderRadius: 8 } as const;
  return (
    <div style={box}>
      <div style={{ fontWeight: 900, color: "#0057b8", marginBottom: 6 }}>Your assessments</div>
      {mySelf.map((r) => (
        <div key={r.id} style={{ marginBottom: 6 }}>
          Your self assessment is ready{r.selfDueDate ? ` — due ${r.selfDueDate.toLocaleDateString("en-NZ", { day: "numeric", month: "long" })}` : ""}.{" "}
          <Link href={`/reviews/${r.id}/self`} className="btn primary">Complete it now</Link>
        </div>
      ))}
      {toDo.map((r) => {
        const selfDone = r.responses.find((x) => x.role === "self")?.status === "Submitted";
        return (
          <div key={r.id} style={{ marginBottom: 6 }}>
            Manager assessment for <b>{r.employee.name}</b> — {selfDone ? "their self assessment is in." : "waiting for their self assessment."}{" "}
            <Link href={`/reviews/${r.id}/manager`} className="btn light">{selfDone ? "Complete it" : "Open"}</Link>
          </div>
        );
      })}
      {outcomes.map((r) => (
        <div key={r.id} style={{ marginBottom: 6 }}>
          Your assessment outcome is ready to read.{" "}
          <Link href={`/reviews/${r.id}/outcome`} className="btn primary">Read it</Link>
        </div>
      ))}
    </div>
  );
}
