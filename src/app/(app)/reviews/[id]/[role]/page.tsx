// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getReviewTemplate, type Ratings, type OutcomeData } from "@/lib/reviewTemplates";
import { AssessmentSheet, type SheetData } from "./AssessmentSheet";

const long = (d: Date | null | undefined) => (d ? d.toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" }) : "");

export default async function AssessmentPage({ params, searchParams }: { params: Promise<{ id: string; role: string }>; searchParams: Promise<{ saved?: string }> }) {
  const user = await requireUser();
  const { id, role: roleRaw } = await params;
  const { saved } = await searchParams;
  if (roleRaw !== "self" && roleRaw !== "manager") notFound();
  const role = roleRaw;

  const review = await prisma.review360.findUnique({ where: { id }, include: { responses: true, employee: true, assessor: true } });
  if (!review) notFound();
  const template = getReviewTemplate(review.templateKey);
  if (!template) notFound();

  const isEmployee = user.id === review.employeeId;
  const isAssessor = user.id === review.assessorId;
  // Self sheet: the employee, their assessor, or a super user. Manager sheet: the assessor or a super user only —
  // the person being assessed never sees the manager's working ratings (they get the finished outcome instead).
  const allowed = role === "self" ? isEmployee || isAssessor || user.isSuperUser : isAssessor || user.isSuperUser;
  if (!allowed) notFound();

  const own = review.responses.find((r) => r.role === role);
  const selfResp = review.responses.find((r) => r.role === "self");
  const mayEdit = review.status !== "Completed" && own?.status !== "Submitted" && (role === "self" ? isEmployee : isAssessor || user.isSuperUser);

  const competencyRows = await prisma.hsCompetency.findMany({ where: { userId: review.employeeId, active: true } });
  const c = competencyRows[0];
  const quals = c?.qualifications ?? "";
  const qualPrefill: Record<string, string> = {};
  if (c?.siteSafeNumber) qualPrefill.sitesafe = `No. ${c.siteSafeNumber}${c.expiryDate ? ` — expires ${long(c.expiryDate)}` : ""}`;
  if (/ewp/i.test(quals)) qualPrefill.height = quals.match(/EWP[^-,]*/i)?.[0]?.trim() ?? "EWP";
  if (/first aid/i.test(quals)) qualPrefill.firstaid = "First Aid";
  if (/bcito|nzqa/i.test(quals)) qualPrefill.trade = /apprentice/i.test(quals) ? "BCITO apprentice" : "NZQA / BCITO qualified";

  const data: SheetData = {
    ratings: (own?.ratings as Ratings) ?? {},
    selfRatings: selfResp?.status === "Submitted" ? ((selfResp.ratings as Ratings) ?? {}) : {},
    sectionNotes: (own?.sectionNotes as Record<string, string>) ?? {},
    feedback: role === "self" ? ((own?.feedback as Record<string, unknown>) ?? {}) : {},
    evidence: (review.evidence as SheetData["evidence"]) ?? [],
    feedback360: (review.feedback360 as SheetData["feedback360"]) ?? {},
    quals: (review.quals as SheetData["quals"]) ?? {},
    qualPrefill,
    outcome: (review.outcome as OutcomeData) ?? {},
    employeeComments: review.employeeComments ?? "",
    selfSubmitted: selfResp?.status === "Submitted",
  };

  return (
    <div>
      <div className="topbar no-print">
        <div>
          <h2>{role === "self" ? "Self assessment" : "Manager assessment"} — {review.employee.name}</h2>
          <div className="subtitle">{review.period}{saved ? " · Draft saved." : ""}</div>
        </div>
        <Link href={`/reviews/${review.id}`} className="btn light">← Assessment overview</Link>
      </div>
      <AssessmentSheet
        reviewId={review.id}
        role={role}
        template={template}
        readOnly={!mayEdit}
        logoSrc="/aliframe-logo.png"
        header={{
          employeeName: review.employee.name,
          currentLevel: review.currentLevel ?? "",
          assessorName: review.assessor?.name ?? "",
          levelSought: review.levelSought ?? "",
          period: review.period,
          assessmentDate: long(review.assessmentDate),
          workLocation: review.workLocation ?? "",
          hoursPattern: review.hoursPattern ?? "",
          contributors: "Self | Manager",
          nextReview: long(review.nextReviewDate),
        }}
        data={data}
      />
    </div>
  );
}
