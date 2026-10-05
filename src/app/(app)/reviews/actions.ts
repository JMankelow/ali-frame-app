// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, requireSuperUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { sendPlainNotificationEmail, profileSigner } from "@/lib/email";
import { appUrl } from "@/lib/invite";
import { getReviewTemplate, FEEDBACK_QUESTIONS, QUALIFICATION_ROWS, FEEDBACK_SOURCES, type Ratings } from "@/lib/reviewTemplates";

export interface ReviewFormState {
  error?: string;
  createdId?: string;
}

const str = (fd: FormData, k: string, max = 4000) => String(fd.get(k) ?? "").trim().slice(0, max);
const optDate = (fd: FormData, k: string) => {
  const v = str(fd, k, 20);
  return v ? new Date(v) : null;
};
const long = (d: Date | null | undefined) => (d ? d.toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" }) : "");

/** Where alerts for this person go: their personal email if that's their preference, else their work email. */
async function addressFor(userId: string): Promise<{ to: string; name: string } | null> {
  const u = await prisma.user.findUnique({ where: { id: userId }, include: { employeeDetail: true } });
  if (!u || !u.isActive || u.email.endsWith(".local")) return null;
  const to = u.employeeDetail?.inviteTo === "personal" && u.employeeDetail.personalEmail ? u.employeeDetail.personalEmail : u.email;
  return { to, name: u.name };
}

/** In-app alert (a task assigned to them, shown on their dashboard) plus an email. Email failures never block the action. */
async function alertPerson(opts: { userId: string; authorId: string; text: string; subject: string; emailBody: string; replyTo?: string; actorEmail?: string }) {
  await prisma.note.create({ data: { text: opts.text, authorId: opts.authorId, assignedToId: opts.userId } });
  const addr = await addressFor(opts.userId);
  if (!addr) return;
  await sendPlainNotificationEmail({
    to: addr.to,
    subject: opts.subject,
    text: `Hi ${addr.name.split(" ")[0]},\n\n${opts.emailBody}`,
    replyTo: opts.replyTo,
    signer: opts.actorEmail ? (profileSigner(opts.actorEmail) ?? undefined) : undefined,
  }).catch(() => undefined);
}

// ---------------------------------------------------------------- create
export async function createReview360(_prev: ReviewFormState, fd: FormData): Promise<ReviewFormState> {
  const actor = await requireSuperUser();
  const employeeId = str(fd, "employeeId", 60);
  const templateKey = str(fd, "templateKey", 40);
  const period = str(fd, "period", 120);
  const assessorId = str(fd, "assessorId", 60);
  const tpl = getReviewTemplate(templateKey);
  if (!tpl) return { error: "Choose which assessment to use." };
  if (!period) return { error: "Enter the review period." };
  if (!assessorId) return { error: "Choose the manager / assessor." };
  if (assessorId === employeeId) return { error: "The assessor can't be the person being assessed." };

  const [employee, assessor] = await Promise.all([prisma.user.findUnique({ where: { id: employeeId } }), prisma.user.findUnique({ where: { id: assessorId } })]);
  if (!employee || !assessor) return { error: "Employee or assessor not found." };

  const selfDueDate = optDate(fd, "selfDueDate");
  const review = await prisma.review360.create({
    data: {
      employeeId,
      assessorId,
      templateKey,
      period,
      currentLevel: str(fd, "currentLevel", 120) || null,
      levelSought: str(fd, "levelSought", 120) || null,
      workLocation: str(fd, "workLocation", 200) || null,
      hoursPattern: str(fd, "hoursPattern", 200) || null,
      assessmentDate: optDate(fd, "assessmentDate"),
      selfDueDate,
      nextReviewDate: optDate(fd, "nextReviewDate"),
      triggeredById: actor.id,
      responses: {
        create: [
          { role: "self", contributorId: employeeId, status: "Pending" },
          { role: "manager", contributorId: assessorId, status: "Pending" },
        ],
      },
    },
  });

  const due = selfDueDate ? ` by ${long(selfDueDate)}` : "";
  await alertPerson({
    userId: employeeId,
    authorId: actor.id,
    text: `Complete your ${tpl.name} assessment (self assessment)${due}: ${appUrl()}/reviews/${review.id}/self`,
    subject: `Your ${tpl.name} assessment is ready to complete`,
    emailBody: `Your ${tpl.name} competency assessment for ${period} is ready. Please complete your self assessment${due}.\n\nOpen it here: ${appUrl()}/reviews/${review.id}/self\n\nIt asks you to rate yourself against each area and to tell us what you would like to develop and what would help you do your job better. You can save it and come back to it.`,
    replyTo: actor.email,
    actorEmail: actor.email,
  });
  await alertPerson({
    userId: assessorId,
    authorId: actor.id,
    text: `Manager assessment for ${employee.name} (${period}) — it opens once their self assessment is in: ${appUrl()}/reviews/${review.id}/manager`,
    subject: `Manager assessment for ${employee.name}`,
    emailBody: `A ${tpl.name} assessment has been started for ${employee.name} (${period}). They have been asked to complete their self assessment${due}. You'll be told when it's in.\n\nYour manager assessment is here: ${appUrl()}/reviews/${review.id}/manager`,
    replyTo: actor.email,
    actorEmail: actor.email,
  });

  await logAudit({ userId: actor.id, action: "review360_created", entityType: "User", entityId: employeeId, metadata: { reviewId: review.id, templateKey, period } });
  revalidatePath(`/employees/${employeeId}`);
  return { createdId: review.id };
}

// ---------------------------------------------------------------- save / submit a sheet
export async function saveAssessment(reviewId: string, role: "self" | "manager", _prev: ReviewFormState, fd: FormData): Promise<ReviewFormState> {
  const user = await requireUser();
  const review = await prisma.review360.findUnique({ where: { id: reviewId }, include: { responses: true, employee: true, assessor: true } });
  if (!review) return { error: "Assessment not found." };
  const tpl = getReviewTemplate(review.templateKey);
  if (!tpl) return { error: "Template missing." };

  if (role === "self" && user.id !== review.employeeId) return { error: "Only the person being assessed can complete the self assessment." };
  if (role === "manager" && user.id !== review.assessorId && !user.isSuperUser) return { error: "Only the assessor can complete the manager assessment." };
  if (review.status === "Completed") return { error: "This assessment is already complete." };

  const response = review.responses.find((r) => r.role === role);
  if (!response) return { error: "Response not found." };
  if (response.status === "Submitted") return { error: "This sheet has already been submitted." };
  const selfResponse = review.responses.find((r) => r.role === "self");
  if (role === "manager" && fd.get("intent") === "submit" && selfResponse?.status !== "Submitted") {
    return { error: `Waiting for ${review.employee.name}'s self assessment before you can submit yours.` };
  }

  const submit = fd.get("intent") === "submit";

  const ratings: Ratings = {};
  let unanswered = 0;
  for (const s of tpl.sections) {
    for (const item of s.items) {
      const raw = str(fd, `r_${item.key}`, 4);
      const n = Number(raw);
      const na = raw === "NO";
      const r = !na && Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
      if (r == null && !na) unanswered += 1;
      ratings[item.key] = { r, na, c: str(fd, `c_${item.key}`, 1000) || undefined };
    }
  }
  if (submit && unanswered > 0) return { error: `Rate every competency (or mark it N/O) before submitting — ${unanswered} still to do.` };

  const sectionNotes: Record<string, string> = {};
  for (const s of tpl.sections) sectionNotes[s.key] = str(fd, `sn_${s.key}`, 1000);

  const feedback: Record<string, unknown> = {};
  if (role === "self") {
    for (const g of FEEDBACK_QUESTIONS) for (const q of g.qs) feedback[q.key] = str(fd, q.key, 2000);
    feedback.topJobs = [1, 2, 3, 4, 5].map((i) => ({ job: str(fd, `tj${i}_job`, 200), outcome: str(fd, `tj${i}_outcome`, 300), rating: str(fd, `tj${i}_rating`, 4), comments: str(fd, `tj${i}_comments`, 500) }));
  }

  await prisma.reviewResponse.update({
    where: { id: response.id },
    data: { ratings, sectionNotes, feedback: role === "self" ? (feedback as object) : undefined, status: submit ? "Submitted" : "Draft", submittedAt: submit ? new Date() : null },
  });

  const reviewUpdate: Record<string, unknown> = {};
  if (role === "self") reviewUpdate.employeeComments = str(fd, "employeeComments", 3000) || null;

  if (role === "manager") {
    reviewUpdate.evidence = [1, 2, 3, 4, 5].map((i) => ({ job: str(fd, `ev${i}_job`, 200), work: str(fd, `ev${i}_work`, 300), period: str(fd, `ev${i}_period`, 100), outcome: str(fd, `ev${i}_outcome`, 300), comments: str(fd, `ev${i}_comments`, 500) }));
    reviewUpdate.feedback360 = Object.fromEntries(FEEDBACK_SOURCES.map((s) => [s.key, { strengths: str(fd, `f360_${s.key}_s`, 1500), development: str(fd, `f360_${s.key}_d`, 1500) }]));
    reviewUpdate.quals = Object.fromEntries(QUALIFICATION_ROWS.map((q) => [q.key, { evidence: str(fd, `ql_${q.key}_e`, 300), status: str(fd, `ql_${q.key}_s`, 100), action: str(fd, `ql_${q.key}_a`, 300) }]));
    reviewUpdate.outcome = {
      currentLevel: str(fd, "o_currentLevel", 200),
      recommendedLevel: str(fd, "o_recommendedLevel", 200),
      payBand: str(fd, "o_payBand", 200),
      placement: str(fd, "o_placement", 300),
      gaps: str(fd, "o_gaps", 1500),
      evidenceNeeded: str(fd, "o_evidenceNeeded", 1500),
      scope: str(fd, "o_scope", 1500),
      decision: str(fd, "o_decision", 100),
      nextReview: str(fd, "o_nextReview", 30),
      timeframe: str(fd, "o_timeframe", 500),
      notes: str(fd, "o_notes", 4000),
      strengths: str(fd, "o_strengths", 3000),
      priorities: str(fd, "o_priorities", 3000),
      benefits: Object.fromEntries(tpl.benefits.map((b, i) => [b.name, str(fd, `ben_${i}`, 10)])),
      plan: [1, 2, 3, 4, 5, 6].map((i) => ({ priority: str(fd, `pl${i}_priority`, 300), action: str(fd, `pl${i}_action`, 600), owner: str(fd, `pl${i}_owner`, 100), target: str(fd, `pl${i}_target`, 100), evidence: str(fd, `pl${i}_evidence`, 400) })),
    };
    const nextReview = optDate(fd, "o_nextReview");
    if (nextReview) reviewUpdate.nextReviewDate = nextReview;
    if (str(fd, "o_currentLevel", 200)) reviewUpdate.currentLevel = str(fd, "o_currentLevel", 200);
  }

  if (submit && role === "self") {
    reviewUpdate.status = "Awaiting manager";
    if (review.assessorId) {
      await alertPerson({
        userId: review.assessorId,
        authorId: user.id,
        text: `${review.employee.name}'s self assessment is in — your manager assessment is ready: ${appUrl()}/reviews/${review.id}/manager`,
        subject: `${review.employee.name} has completed their self assessment`,
        emailBody: `${review.employee.name} has submitted their self assessment (${review.period}). Your manager assessment is ready to complete:\n\n${appUrl()}/reviews/${review.id}/manager`,
      });
    }
  }
  if (submit && role === "manager") {
    reviewUpdate.status = "Completed";
    reviewUpdate.completedAt = new Date();
    reviewUpdate.managerAckAt = new Date();
    await alertPerson({
      userId: review.employeeId,
      authorId: user.id,
      text: `Your ${tpl.name} assessment outcome is ready to read: ${appUrl()}/reviews/${review.id}/outcome`,
      subject: `Your ${tpl.name} assessment outcome is ready`,
      emailBody: `Your ${tpl.name} assessment for ${review.period} is complete. You can read the outcome and development plan here:\n\n${appUrl()}/reviews/${review.id}/outcome`,
      replyTo: user.email,
      actorEmail: user.email,
    });
  }

  if (Object.keys(reviewUpdate).length) await prisma.review360.update({ where: { id: reviewId }, data: reviewUpdate });

  await logAudit({ userId: user.id, action: submit ? `review360_${role}_submitted` : `review360_${role}_saved`, entityType: "User", entityId: review.employeeId, metadata: { reviewId } });
  revalidatePath(`/reviews/${reviewId}`);
  revalidatePath(`/employees/${review.employeeId}`);
  redirect(submit ? `/reviews/${reviewId}?done=${role}` : `/reviews/${reviewId}/${role}?saved=1`);
}

// ---------------------------------------------------------------- employee acknowledgement of the outcome
export async function acknowledgeOutcome(reviewId: string, _prev: ReviewFormState, fd: FormData): Promise<ReviewFormState> {
  const user = await requireUser();
  const review = await prisma.review360.findUnique({ where: { id: reviewId } });
  if (!review || review.employeeId !== user.id) return { error: "Only the person assessed can acknowledge their outcome." };
  if (review.status !== "Completed") return { error: "The outcome isn't ready yet." };
  const tokens = (v: string) => v.toLowerCase().replace(/[^a-z' -]/g, " ").split(/\s+/).filter(Boolean);
  const mine = tokens(user.name);
  const typed = tokens(str(fd, "signedBy", 100));
  if (!(typed.includes(mine[0]) && typed.includes(mine[mine.length - 1]))) return { error: `Type your own name (${user.name}) to acknowledge.` };
  await prisma.review360.update({ where: { id: reviewId }, data: { employeeAckAt: new Date(), employeeComments: str(fd, "employeeComments", 3000) || review.employeeComments } });
  await logAudit({ userId: user.id, action: "review360_acknowledged", entityType: "User", entityId: user.id, metadata: { reviewId } });
  revalidatePath(`/reviews/${reviewId}/outcome`);
  return {};
}
