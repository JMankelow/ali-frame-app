// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireSuperUser, requireNotInstaller } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { redirect } from "next/navigation";
import { sendPlainNotificationEmail } from "@/lib/email";
import { PRESTART_ITEMS, WEATHER_OPTIONS, RISK_LEVELS, HS_IMPORT_STATUS } from "@/lib/hsDocs";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const optDate = (fd: FormData, k: string) => {
  const v = str(fd, k);
  return v ? new Date(v) : null;
};
const level = (v: string) => ((RISK_LEVELS as readonly string[]).includes(v) ? v : "MEDIUM");
const done = () => revalidatePath("/health-safety");

// ---- Training & Competency Register ----
export async function saveCompetency(fd: FormData) {
  const user = await requireNotInstaller();
  const id = str(fd, "id");
  const name = str(fd, "name");
  if (!name) return;
  const comp = parseInt(str(fd, "competency"));
  const data = {
    name,
    userId: str(fd, "userId") || null,
    siteSafeNumber: str(fd, "siteSafeNumber") || null,
    keyRole: str(fd, "keyRole") || null,
    qualifications: str(fd, "qualifications") || null,
    expiryDate: optDate(fd, "expiryDate"),
    yearsExperience: str(fd, "yearsExperience") || null,
    competency: comp >= 1 && comp <= 5 ? comp : null,
  };
  if (id) await prisma.hsCompetency.update({ where: { id }, data });
  else await prisma.hsCompetency.create({ data });
  await logAudit({ userId: user.id, action: id ? "hs_competency_updated" : "hs_competency_added", entityType: "HsCompetency", entityId: id || undefined, metadata: { name } });
  done();
}

/** Archive, never hard-delete (standing rule). */
export async function archiveCompetency(id: string) {
  const user = await requireNotInstaller();
  await prisma.hsCompetency.update({ where: { id }, data: { active: false } });
  await logAudit({ userId: user.id, action: "hs_competency_archived", entityType: "HsCompetency", entityId: id });
  done();
}

// ---- Company Hazard & Risk Register ----
export async function saveRisk(fd: FormData) {
  const user = await requireNotInstaller();
  const id = str(fd, "id");
  const hazard = str(fd, "hazard");
  const activity = str(fd, "activity");
  const controls = str(fd, "controls");
  if (!hazard || !activity || !controls) return;
  const data = {
    activity,
    hazard,
    controls,
    potentialHarm: str(fd, "potentialHarm") || null,
    initialRisk: level(str(fd, "initialRisk")),
    residualRisk: level(str(fd, "residualRisk")),
    ownerName: str(fd, "ownerName") || null,
    reviewDate: optDate(fd, "reviewDate"),
  };
  if (id) await prisma.hsRisk.update({ where: { id }, data });
  else await prisma.hsRisk.create({ data });
  await logAudit({ userId: user.id, action: id ? "hs_risk_updated" : "hs_risk_added", entityType: "HsRisk", entityId: id || undefined, metadata: { hazard } });
  done();
}

export async function closeRisk(id: string) {
  const user = await requireNotInstaller();
  await prisma.hsRisk.update({ where: { id }, data: { status: "Closed" } });
  await logAudit({ userId: user.id, action: "hs_risk_closed", entityType: "HsRisk", entityId: id });
  done();
}

// ---- Pre-starts and Task Analyses (JSA) ----
export interface PreStartState {
  error?: string;
}

const SAFETY_NOTIFY_EMAIL = "tanya@aliframe.co.nz";

function parseJson<T>(raw: string, fallback: T, maxLen = 20000): T {
  if (!raw || raw.length > maxLen) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Daily pre-start: site & weather, hazard check (Yes / No / N/A; a "No" on a critical check is a stop-work),
 * today's hazards & controls, work discussion, and crew sign-on. A critical "No" also raises a hazard
 * report and notifies the H&S representative.
 */
export async function submitPreStart(_prev: PreStartState, fd: FormData): Promise<PreStartState> {
  const user = await requireUser();

  const jobNumber = str(fd, "jobNumber") || null;
  let siteAddress = str(fd, "siteAddress");
  if (jobNumber) {
    const job = await prisma.job.findUnique({ where: { number: jobNumber }, select: { address: true } });
    if (!job) return { error: "That job couldn't be found." };
    if (!siteAddress) siteAddress = job.address ?? "";
  }
  if (!siteAddress) return { error: "Enter the site address (or pick a job)." };

  const answers = parseJson<Record<string, string>>(str(fd, "answers"), {});
  const checks: Record<string, string> = {};
  const failed: string[] = [];
  const criticalFailed: string[] = [];
  for (const item of PRESTART_ITEMS) {
    const a = answers[item.key];
    const allowed = item.critical ? ["Yes", "No"] : ["Yes", "No", "N/A"];
    if (!allowed.includes(a)) return { error: `Answer every check — missing: ${item.label}.` };
    checks[item.label] = a === "Yes" ? "Pass" : a === "No" ? "Fail" : "N/A";
    if (a === "No") {
      failed.push(item.label);
      if (item.critical) criticalFailed.push(item.label);
    }
  }

  const weather = parseJson<string[]>(str(fd, "weather"), []).filter((w) => WEATHER_OPTIONS.includes(w));
  const hazards = parseJson<{ hazard?: string; risk?: string; control?: string }[]>(str(fd, "hazards"), [])
    .slice(0, 20)
    .map((h) => ({ hazard: String(h.hazard ?? "").trim().slice(0, 200), risk: RISK_LEVELS.includes(h.risk as (typeof RISK_LEVELS)[number]) ? h.risk : "", control: String(h.control ?? "").trim().slice(0, 400) }))
    .filter((h) => h.hazard);
  const crew = parseJson<{ name?: string; userId?: string }[]>(str(fd, "crew"), [])
    .slice(0, 30)
    .map((c) => ({ name: String(c.name ?? "").trim().slice(0, 100), userId: c.userId ? String(c.userId) : undefined }))
    .filter((c) => c.name);
  if (crew.length === 0) return { error: "Sign on at least one person to the crew." };

  const startTime = str(fd, "startTime").slice(0, 8) || null;
  const stopWork = criticalFailed.length > 0;
  const weatherNote = str(fd, "weatherNote").slice(0, 300);
  const issues = [weatherNote && `Conditions: ${weatherNote}`, failed.length ? `Failed checks: ${failed.join("; ")}` : ""].filter(Boolean).join(" — ") || null;

  const created = await prisma.hsPreStart.create({
    data: {
      date: new Date(),
      jobNumber,
      completedById: user.id,
      crewNames: crew.map((c) => c.name).join(", "),
      checks,
      issues,
      siteAddress,
      startTime,
      weather,
      hazards,
      workNotes: str(fd, "workNotes").slice(0, 2000) || null,
      crewSignOn: crew,
      stopWork,
    },
  });

  if (stopWork) {
    await prisma.safetyIncident.create({
      data: {
        type: "Hazard",
        severity: "High",
        description: `STOP WORK — pre-start critical check answered No: ${criticalFailed.join("; ")}. Site: ${siteAddress}. Recorded by ${user.name}.`,
        jobNumber,
        reportedById: user.id,
      },
    });
    await sendPlainNotificationEmail({
      to: SAFETY_NOTIFY_EMAIL,
      subject: `STOP WORK — pre-start critical check failed${jobNumber ? ` (job ${jobNumber})` : ""}`,
      text: `${user.name} answered NO to: ${criticalFailed.join("; ")}\nSite: ${siteAddress}\n\nWork must not start until this is resolved. A hazard report has been opened in Health & Safety.`,
    }).catch(() => undefined);
  }

  await logAudit({
    userId: user.id,
    action: "hs_prestart_completed",
    entityType: jobNumber ? "Job" : "HsPreStart",
    entityId: jobNumber ?? created.id,
    metadata: { failed: failed.length, criticalFailed: criticalFailed.length, crew: crew.length },
  });
  done();
  redirect("/health-safety");
}

export async function createJsa(fd: FormData) {
  const user = await requireUser();
  const jobNumber = str(fd, "jobNumber");
  const task = str(fd, "task");
  if (!jobNumber || !task) return;
  const steps = [1, 2, 3, 4, 5, 6]
    .map((i) => ({ step: str(fd, `step${i}`), hazard: str(fd, `hazard${i}`), risk: str(fd, `risk${i}`), control: str(fd, `control${i}`) }))
    .filter((s) => s.step || s.hazard || s.control);
  await prisma.hsJsa.create({ data: { jobNumber, task, steps, preparedById: user.id, status: "Issued" } });
  await logAudit({ userId: user.id, action: "hs_jsa_created", entityType: "Job", entityId: jobNumber, metadata: { task } });
  done();
}

// ---- Site Specific Safety Plan ----
export async function saveSssp(fd: FormData) {
  const user = await requireNotInstaller();
  const jobNumber = str(fd, "jobNumber");
  if (!jobNumber) return;
  const s = (k: string) => str(fd, k) || null;
  const data = {
    siteAddress: s("siteAddress"),
    siteActivities: s("siteActivities"),
    mainContractor: s("mainContractor"),
    pcbu1ProjectManager: s("pcbu1ProjectManager"),
    pcbu1SiteManager: s("pcbu1SiteManager"),
    pcbu1HsRep: s("pcbu1HsRep"),
    pcbu2ProjectManager: s("pcbu2ProjectManager"),
    pcbu2SiteManager: s("pcbu2SiteManager"),
    pcbu2HsRep: s("pcbu2HsRep"),
    pcbu1SignedBy: s("pcbu1SignedBy"),
    pcbu1SignedAt: optDate(fd, "pcbu1SignedAt"),
    pcbu2SignedBy: s("pcbu2SignedBy"),
    pcbu2SignedAt: optDate(fd, "pcbu2SignedAt"),
    approvedToStartBy: s("approvedToStartBy"),
    approvedToStartAt: optDate(fd, "approvedToStartAt"),
    siteNotes: s("siteNotes"),
    status: s("approvedToStartBy") ? "Approved to start" : "Draft",
    updatedById: user.id,
  };
  await prisma.hsSssp.upsert({ where: { jobNumber }, create: { jobNumber, ...data }, update: data });
  await logAudit({ userId: user.id, action: "hs_sssp_saved", entityType: "Job", entityId: jobNumber });
  done();
}

export async function addSsspSignOn(fd: FormData) {
  const user = await requireUser();
  const ssspId = str(fd, "ssspId");
  const name = str(fd, "name");
  if (!ssspId || !name) return;
  const sssp = await prisma.hsSssp.findUnique({ where: { id: ssspId }, select: { jobNumber: true } });
  if (!sssp) return;
  await prisma.hsSsspSignOn.create({
    data: { ssspId, name, company: str(fd, "company") || null, inductionDate: optDate(fd, "inductionDate"), recordedById: user.id },
  });
  await logAudit({ userId: user.id, action: "hs_sssp_signon_added", entityType: "Job", entityId: sssp.jobNumber, metadata: { name } });
  done();
}

// ---- Inductions ----
export async function createInduction(fd: FormData) {
  const user = await requireNotInstaller();
  const userId = str(fd, "userId");
  if (!userId) return;
  await prisma.hsInduction.create({
    data: { userId, jobNumber: str(fd, "jobNumber") || null, siteName: str(fd, "siteName") || null, inductedBy: str(fd, "inductedBy") || user.name, date: optDate(fd, "date") ?? new Date(), notes: str(fd, "notes") || null },
  });
  await logAudit({ userId: user.id, action: "hs_induction_recorded", entityType: "User", entityId: userId });
  done();
}

// ---- Company documents ----
export async function saveDocument(slug: string, fd: FormData) {
  const user = await requireSuperUser();
  const content = str(fd, "content");
  if (!content) return;
  const approved = fd.get("approved") === "on";
  await prisma.hsDocument.update({
    where: { slug },
    data: {
      content,
      version: str(fd, "version") || null,
      effectiveDate: optDate(fd, "effectiveDate"),
      nextReviewDate: optDate(fd, "nextReviewDate"),
      // Only marked approved when a named super user explicitly ticks it — never implied.
      status: approved ? `APPROVED by ${user.name} on ${new Date().toLocaleDateString("en-NZ")}` : HS_IMPORT_STATUS,
      updatedByName: user.name,
    },
  });
  await logAudit({ userId: user.id, action: approved ? "hs_document_approved" : "hs_document_saved", entityType: "HsDocument", entityId: slug });
  done();
}
