// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getReviewTemplate } from "@/lib/reviewTemplates";

const long = (d: Date | null | undefined) => (d ? d.toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" }) : "—");

export default async function ReviewOverviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { done } = await searchParams;
  const review = await prisma.review360.findUnique({ where: { id }, include: { responses: true, employee: true, assessor: true } });
  if (!review) notFound();
  const isEmployee = user.id === review.employeeId;
  const isAssessor = user.id === review.assessorId;
  if (!isEmployee && !isAssessor && !user.isSuperUser) notFound();
  const tpl = getReviewTemplate(review.templateKey);
  const self = review.responses.find((r) => r.role === "self");
  const mgr = review.responses.find((r) => r.role === "manager");
  const complete = review.status === "Completed";
  const color = (s?: string) => (s === "Submitted" ? "green" : s === "Draft" ? "orange" : "grey");

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>{tpl?.name ?? "Assessment"} assessment — {review.employee.name}</h2>
          <div className="subtitle">{review.period} · <span className={`status ${complete ? "green" : "orange"}`}>{review.status}</span></div>
        </div>
        {user.isSuperUser && <Link href={`/employees/${review.employeeId}`} className="btn light">← Employee file</Link>}
      </div>

      {done === "self" && <div className="card" style={{ borderColor: "#16a34a" }}>Thank you — your self assessment has been submitted and {review.assessor?.name ?? "your manager"} has been told.</div>}
      {done === "manager" && <div className="card" style={{ borderColor: "#16a34a" }}>Manager assessment submitted. {review.employee.name} has been told their outcome is ready.</div>}

      <div className="cards" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="label">Self assessment</div>
          <div style={{ margin: "8px 0" }}><span className={`status ${color(self?.status)}`}>{self?.status ?? "Pending"}</span></div>
          <div className="hint">{review.employee.name}{review.selfDueDate ? ` · due ${long(review.selfDueDate)}` : ""}</div>
          {(isEmployee || isAssessor || user.isSuperUser) && (
            <div className="actions" style={{ marginTop: 10 }}>
              <Link href={`/reviews/${review.id}/self`} className="btn primary">{isEmployee && self?.status !== "Submitted" ? (self?.status === "Draft" ? "Continue my self assessment" : "Start my self assessment") : "Open"}</Link>
            </div>
          )}
        </div>
        {(isAssessor || user.isSuperUser) && (
          <div className="card">
            <div className="label">Manager assessment</div>
            <div style={{ margin: "8px 0" }}><span className={`status ${color(mgr?.status)}`}>{mgr?.status ?? "Pending"}</span></div>
            <div className="hint">{review.assessor?.name ?? "—"}{self?.status !== "Submitted" ? " · waiting for the self assessment" : ""}</div>
            <div className="actions" style={{ marginTop: 10 }}>
              <Link href={`/reviews/${review.id}/manager`} className="btn primary">{mgr?.status === "Submitted" ? "Open" : self?.status === "Submitted" ? "Complete manager assessment" : "Open (read the self assessment when it's in)"}</Link>
            </div>
          </div>
        )}
        <div className="card">
          <div className="label">Outcome &amp; development plan</div>
          <div style={{ margin: "8px 0" }}><span className={`status ${complete ? "green" : "grey"}`}>{complete ? "Ready" : "Not ready yet"}</span></div>
          {complete && (
            <div className="actions" style={{ marginTop: 10 }}>
              <Link href={`/reviews/${review.id}/outcome`} className="btn primary">Read the outcome</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
