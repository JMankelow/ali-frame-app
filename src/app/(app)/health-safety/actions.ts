"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { sendPlainNotificationEmail } from "@/lib/email";

const SAFETY_NOTIFY_EMAIL = "tanya@aliframe.co.nz";

export interface SafetyIncidentFormState {
  error?: string;
}

export async function createSafetyIncident(_prevState: SafetyIncidentFormState, formData: FormData): Promise<SafetyIncidentFormState> {
  const user = await requireUser();

  const type = String(formData.get("type") ?? "Incident");
  const severity = String(formData.get("severity") ?? "Low");
  const description = String(formData.get("description") ?? "").trim();
  const jobNumber = String(formData.get("jobNumber") ?? "").trim();

  if (!description) return { error: "Describe what happened." };

  await prisma.safetyIncident.create({
    data: { type, severity, description, jobNumber: jobNumber || null, reportedById: user.id },
  });

  await sendPlainNotificationEmail({
    to: SAFETY_NOTIFY_EMAIL,
    subject: `${type} reported (${severity})${jobNumber ? ` — ${jobNumber}` : ""}`,
    text: `${user.name} reported a ${severity.toLowerCase()} severity ${type.toLowerCase()}${jobNumber ? ` on job ${jobNumber}` : ""}:\n\n${description}`,
  });

  await logAudit({ userId: user.id, action: "safety_incident_created", entityType: "SafetyIncident", metadata: { type, severity, jobNumber } });
  revalidatePath("/health-safety");
  return {};
}

export async function resolveSafetyIncident(id: string, formData: FormData) {
  const user = await requireUser();
  const actionTaken = String(formData.get("actionTaken") ?? "").trim();

  await prisma.safetyIncident.update({
    where: { id },
    data: { status: "Resolved", resolvedAt: new Date(), actionTaken: actionTaken || undefined },
  });

  await logAudit({ userId: user.id, action: "safety_incident_resolved", entityType: "SafetyIncident", entityId: id });
  revalidatePath("/health-safety");
}
