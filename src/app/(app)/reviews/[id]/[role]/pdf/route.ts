// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getReviewTemplate, type Ratings } from "@/lib/reviewTemplates";
import { generateAssessmentSheetPdf } from "@/lib/reviewPdf";

/** A self or manager assessment sheet as a PDF (as saved so far). The manager sheet is only for the assessor or a super user. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; role: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id, role } = await params;
  if (role !== "self" && role !== "manager") return NextResponse.json({ error: "Not found" }, { status: 404 });

  const review = await prisma.review360.findUnique({ where: { id }, include: { responses: true, employee: true, assessor: true } });
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isAssessor = user.id === review.assessorId;
  const allowed = role === "manager" ? isAssessor || user.isSuperUser : user.id === review.employeeId || isAssessor || user.isSuperUser;
  const tpl = getReviewTemplate(review.templateKey);
  if (!allowed || !tpl) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const r = review.responses.find((x) => x.role === role);
  const pdf = await generateAssessmentSheetPdf({
    tpl,
    role,
    employeeName: review.employee.name,
    assessorName: review.assessor?.name ?? null,
    period: review.period,
    status: r?.status ?? "Pending",
    submittedAt: r?.submittedAt ?? null,
    ratings: (r?.ratings as Ratings) ?? {},
    sectionNotes: (r?.sectionNotes as Record<string, string>) ?? {},
    feedback: (r?.feedback as Record<string, unknown>) ?? {},
  });
  const file = `${role === "self" ? "Self" : "Manager"} assessment - ${review.employee.name}.pdf`.replace(/[^a-zA-Z0-9 ._-]/g, "");
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${file}"`, "Cache-Control": "private, no-store" },
  });
}
