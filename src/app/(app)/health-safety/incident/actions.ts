// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isInstallerProfile } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { sendPlainNotificationEmail } from "@/lib/email";
import { appUrl } from "@/lib/invite";
import { severityOf, validateIncident, type Answers } from "@/lib/incidentLogic";

const SAFETY_REP_EMAIL = "tanya@aliframe.co.nz";

export interface IncidentResult {
  error?: string;
  id?: string;
  reference?: string;
}

/** Saves a finished Accident / Incident & Near-Miss report. Open to every signed-in user — field staff included. */
export async function submitIncidentReport(rawAnswers: Answers): Promise<IncidentResult> {
  const user = await requireUser();

  // Re-run the form's own rules on the server: hidden answers are dropped, required ones must be there.
  const { clean, problems } = validateIncident(rawAnswers && typeof rawAnswers === "object" ? rawAnswers : {});
  if (problems.length) return { error: `${problems.length} required answer${problems.length === 1 ? " is" : "s are"} still missing (${problems[0].label}${problems.length > 1 ? ", …" : ""}).` };

  const str = (k: string) => (typeof clean[k] === "string" ? (clean[k] as string) : "");
  const signature = str("signature");
  if (!signature.startsWith("data:image/png;base64,") || signature.length > 400_000) return { error: "Please sign the form (the signature is missing or too large)." };

  const outcome = str("outcome");
  const notifiable = outcome === "Serious harm / notifiable event";
  const accidentDate = new Date(`${str("accident_date")}T12:00:00.000Z`);
  if (Number.isNaN(accidentDate.getTime())) return { error: "The accident date isn't valid." };

  const { signature: _sig, ...data } = clean; // the signature lives in its own column
  void _sig;

  // INC-0001, INC-0002 … (retry once if two reports land at the same moment).
  let report: { id: string; reference: string } | null = null;
  for (let attempt = 0; attempt < 3 && !report; attempt++) {
    const last = await prisma.incidentReport.findFirst({ orderBy: { reference: "desc" }, select: { reference: true } });
    const next = (Number(last?.reference.replace("INC-", "")) || 0) + 1 + attempt;
    try {
      report = await prisma.incidentReport.create({
        data: {
          reference: `INC-${String(next).padStart(4, "0")}`,
          personName: str("name").slice(0, 160),
          siteName: str("site_name").slice(0, 200),
          outcome,
          notifiable,
          accidentDate,
          data: data as never,
          signature,
          submittedById: user.id,
        },
        select: { id: true, reference: true },
      });
    } catch {
      /* reference clash — try the next number */
    }
  }
  if (!report) return { error: "Couldn't save the report — please try again." };

  // Also open an entry on the Incidents register so it shows up on the dashboards.
  const si = await prisma.safetyIncident.create({
    data: {
      type: outcome === "Near-miss" ? "Near Miss" : "Incident",
      severity: severityOf(outcome),
      description: `${report.reference}: ${str("how") || "(no description)"} — Where: ${str("where")}. Person: ${str("name")}. Outcome: ${outcome}.`.slice(0, 1800),
      reportedById: user.id,
      actionTaken: str("steps_taken") || null,
    },
  });
  await prisma.incidentReport.update({ where: { id: report.id }, data: { safetyIncidentId: si.id } });

  // Tell the H&S representative every time; tell the whole management team when it was serious.
  const link = `${appUrl()}/health-safety/incident/${report.id}`;
  const body =
    `${report.reference} — ${outcome}\nPerson: ${str("name")}\nSite: ${str("site_name")}\nWhen: ${str("accident_date")} ${str("accident_time")}\nWhere: ${str("where")}\nReported by: ${user.name}\n\n` +
    (notifiable ? "THIS IS A NOTIFIABLE EVENT: it must be reported to WorkSafe NZ as soon as possible (0800 030 040), and the scene must not be disturbed unless needed to make it safe.\n\n" : "") +
    `Open the report: ${link}`;
  const to = new Set<string>([SAFETY_REP_EMAIL]);
  if (severityOf(outcome) === "High") for (const u of await prisma.user.findMany({ where: { isSuperUser: true, isActive: true }, select: { email: true } })) to.add(u.email);
  await sendPlainNotificationEmail({ to: [...to], subject: `${notifiable ? "NOTIFIABLE EVENT — " : ""}Accident / incident report ${report.reference} — ${str("name")}`, text: body }).catch((e) => console.error("[incident] notification email failed", e));

  const tanya = await prisma.user.findFirst({ where: { email: SAFETY_REP_EMAIL, isActive: true }, select: { id: true } });
  if (tanya) await prisma.note.create({ data: { text: `New accident / incident report ${report.reference} (${outcome}) for ${str("name")} — please review the actions.`, authorId: user.id, assignedToId: tanya.id } }).catch(() => undefined);

  await logAudit({ userId: user.id, action: "incident_report_submitted", entityType: "IncidentReport", entityId: report.id, metadata: { reference: report.reference, outcome, notifiable } });
  revalidatePath("/health-safety");
  revalidatePath("/health-safety/incident");
  return { id: report.id, reference: report.reference };
}

/** Open/close a report (management only — field staff can't close their own). */
export async function setIncidentStatus(id: string, status: "Open" | "Closed") {
  const user = await requireUser();
  if (isInstallerProfile(user)) return;
  await prisma.incidentReport.update({ where: { id }, data: { status } });
  await logAudit({ userId: user.id, action: status === "Closed" ? "incident_report_closed" : "incident_report_reopened", entityType: "IncidentReport", entityId: id });
  revalidatePath(`/health-safety/incident/${id}`);
  revalidatePath("/health-safety/incident");
}
