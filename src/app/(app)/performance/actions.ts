"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export interface AssessmentFormState {
  error?: string;
}

function parseScore(formData: FormData, field: string): number | null {
  const raw = String(formData.get(field) ?? "").trim();
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
}

export async function submitInstallerAssessment(_prevState: AssessmentFormState, formData: FormData): Promise<AssessmentFormState> {
  const user = await requireUser();

  const revieweeId = String(formData.get("revieweeId") ?? "").trim();
  if (!revieweeId) return { error: "Select who this assessment is for." };

  const jobNumber = String(formData.get("jobNumber") ?? "").trim();
  const reviewPeriod = String(formData.get("reviewPeriod") ?? "").trim();
  const overallResult = String(formData.get("overallResult") ?? "").trim();
  const keyWins = String(formData.get("keyWins") ?? "").trim();
  const keyIssues = String(formData.get("keyIssues") ?? "").trim();
  const actionsRequired = String(formData.get("actionsRequired") ?? "").trim();
  const isSelfAssessment = revieweeId === user.id;

  const qualityScore = parseScore(formData, "qualityScore");
  if (!qualityScore) return { error: "Overall quality score (1-5) is required." };

  if (jobNumber) {
    const job = await prisma.job.findUnique({ where: { number: jobNumber } });
    if (!job) return { error: `Job ${jobNumber} not found.` };
  }

  await prisma.installerAssessment.create({
    data: {
      revieweeId,
      reviewerId: user.id,
      jobNumber: jobNumber || null,
      reviewPeriod: reviewPeriod || null,
      isSelfAssessment,
      coreInstallationScore: parseScore(formData, "coreInstallationScore"),
      healthSafetyScore: parseScore(formData, "healthSafetyScore"),
      residentialScore: parseScore(formData, "residentialScore"),
      commercialScore: parseScore(formData, "commercialScore"),
      leadershipScore: parseScore(formData, "leadershipScore"),
      administrationScore: parseScore(formData, "administrationScore"),
      overallResult: overallResult || null,
      qualityScore,
      keyWins: keyWins || null,
      keyIssues: keyIssues || null,
      actionsRequired: actionsRequired || null,
    },
  });

  await logAudit({
    userId: user.id,
    action: "installer_assessment_submitted",
    entityType: "InstallerAssessment",
    metadata: { revieweeId, jobNumber, isSelfAssessment },
  });
  revalidatePath("/performance");
  revalidatePath("/senior-performance");
  return {};
}
