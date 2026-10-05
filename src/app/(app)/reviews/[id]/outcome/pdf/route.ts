// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getReviewTemplate, type OutcomeData, type Ratings } from "@/lib/reviewTemplates";
import { generateOutcomePdf } from "@/lib/reviewPdf";

/** The finished 360 outcome & development plan as a PDF — same access rules as the outcome page. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;

  const review = await prisma.review360.findUnique({ where: { id }, include: { responses: true, employee: true, assessor: true } });
  const allowed = review && (user.id === review.employeeId || user.id === review.assessorId || user.isSuperUser);
  const tpl = review ? getReviewTemplate(review.templateKey) : undefined;
  if (!review || !allowed || review.status !== "Completed" || !tpl) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const self = review.responses.find((r) => r.role === "self");
  const mgr = review.responses.find((r) => r.role === "manager");
  const pdf = await generateOutcomePdf({
    tpl,
    employeeName: review.employee.name,
    assessorName: review.assessor?.name ?? null,
    period: review.period,
    currentLevel: review.currentLevel,
    hoursPattern: review.hoursPattern,
    assessmentDate: review.assessmentDate,
    completedAt: review.completedAt,
    nextReviewDate: review.nextReviewDate,
    employeeComments: review.employeeComments,
    employeeAckAt: review.employeeAckAt,
    managerAckAt: review.managerAckAt,
    selfRatings: (self?.ratings as Ratings) ?? {},
    mgrRatings: (mgr?.ratings as Ratings) ?? {},
    mgrNotes: (mgr?.sectionNotes as Record<string, string>) ?? {},
    outcome: (review.outcome as OutcomeData) ?? {},
  });
  const file = `360 Review Outcome - ${review.employee.name}.pdf`.replace(/[^a-zA-Z0-9 ._-]/g, "");
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${file}"`, "Cache-Control": "private, no-store" },
  });
}
