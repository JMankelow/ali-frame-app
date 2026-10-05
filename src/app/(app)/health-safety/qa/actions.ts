// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, type SessionUser } from "@/lib/session";
import { isInstallerProfile } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export interface QaFormState {
  error?: string;
  saved?: string;
}

/** Installers can create and edit their own reports; office staff can edit any. */
export async function canEditQa(user: SessionUser, createdById: string): Promise<boolean> {
  return !isInstallerProfile(user) || user.id === createdById;
}

/** Step 1: pick the job → creates a draft report and opens it. Open to installers. */
export async function createQaReport(formData: FormData) {
  const user = await requireUser();
  const jobNumber = String(formData.get("jobNumber") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim().slice(0, 120) || "Installation QA Report";
  if (!jobNumber) redirect("/health-safety/qa?error=job");
  const job = await prisma.job.findUnique({ where: { number: jobNumber }, select: { number: true } });
  if (!job) redirect("/health-safety/qa?error=job");

  const r = await prisma.qaReport.create({ data: { jobNumber, title, reportDate: new Date(), createdById: user.id } });
  await logAudit({ userId: user.id, action: "qa_report_created", entityType: "QaReport", entityId: r.id, metadata: { jobNumber } });
  redirect(`/health-safety/qa/${r.id}`);
}

/** Attaches freshly uploaded photos (already stored against the job) to the report. */
export async function addQaPhotos(reportId: string, storageKeys: string[]): Promise<{ error?: string; added?: number }> {
  const user = await requireUser();
  const report = await prisma.qaReport.findUnique({ where: { id: reportId }, include: { photos: { select: { sortOrder: true } } } });
  if (!report || !(await canEditQa(user, report.createdById))) return { error: "Report not found." };
  if (report.status === "Final") return { error: "This report is final — it can't be changed." };

  const keys = (Array.isArray(storageKeys) ? storageKeys : []).map(String).slice(0, 40);
  const files = await prisma.fileAsset.findMany({ where: { jobNumber: report.jobNumber, storageKey: { in: keys }, mimeType: { startsWith: "image/" } } });
  let order = Math.max(-1, ...report.photos.map((p) => p.sortOrder)) + 1;
  for (const f of files) await prisma.qaReportPhoto.create({ data: { reportId, fileId: f.id, sortOrder: order++ } });
  revalidatePath(`/health-safety/qa/${reportId}`);
  return { added: files.length };
}

/** Saves the title, summary, and each photo's label + description. "Finalise" requires every photo to be labelled. */
export async function saveQaReport(reportId: string, _prev: QaFormState, formData: FormData): Promise<QaFormState> {
  const user = await requireUser();
  const report = await prisma.qaReport.findUnique({ where: { id: reportId }, include: { photos: true } });
  if (!report || !(await canEditQa(user, report.createdById))) return { error: "Report not found." };
  if (report.status === "Final") return { error: "This report is final — it can't be changed." };

  let p: { title?: string; description?: string; reportDate?: string; photos?: { id: string; label: string; description: string }[] };
  try {
    p = JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return { error: "Couldn't read the form — please try again." };
  }
  const finalise = formData.get("intent") === "final";
  const photos = (Array.isArray(p.photos) ? p.photos : []).filter((x) => report.photos.some((rp) => rp.id === x.id));

  if (finalise) {
    if (report.photos.length === 0) return { error: "Add at least one photo before finalising." };
    const unlabelled = report.photos.filter((rp) => !(photos.find((x) => x.id === rp.id)?.label ?? rp.label).trim());
    if (unlabelled.length) return { error: `Every photo must be labelled — ${unlabelled.length} photo${unlabelled.length === 1 ? " is" : "s are"} still missing a label.` };
  }

  for (const x of photos) {
    await prisma.qaReportPhoto.update({ where: { id: x.id }, data: { label: String(x.label ?? "").slice(0, 120), description: String(x.description ?? "").slice(0, 2000) } });
  }
  const date = p.reportDate && /^\d{4}-\d{2}-\d{2}$/.test(p.reportDate) ? new Date(`${p.reportDate}T12:00:00.000Z`) : report.reportDate;
  await prisma.qaReport.update({
    where: { id: reportId },
    data: { title: String(p.title ?? report.title).trim().slice(0, 120) || report.title, description: String(p.description ?? "").slice(0, 4000), reportDate: date, status: finalise ? "Final" : "Draft" },
  });
  await logAudit({ userId: user.id, action: finalise ? "qa_report_finalised" : "qa_report_saved", entityType: "QaReport", entityId: reportId });
  revalidatePath(`/health-safety/qa/${reportId}`);
  revalidatePath("/health-safety/qa");
  return { saved: finalise ? "Report finalised." : "Saved." };
}

export async function removeQaPhoto(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("photoId") ?? "");
  const photo = id ? await prisma.qaReportPhoto.findUnique({ where: { id }, include: { report: true } }) : null;
  if (photo && photo.report.status !== "Final" && (await canEditQa(user, photo.report.createdById))) {
    await prisma.qaReportPhoto.delete({ where: { id } }); // only removes it from the report — the photo stays on the job
    revalidatePath(`/health-safety/qa/${photo.reportId}`);
  }
  redirect(`/health-safety/qa/${photo?.reportId ?? ""}`);
}
