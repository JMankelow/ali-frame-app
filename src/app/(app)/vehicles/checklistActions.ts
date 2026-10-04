"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireNotInstaller } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { redirect } from "next/navigation";
import { isInstallerProfile } from "@/lib/permissions";
import { sendVehicleChecklistEmail, sendVehicleChecklistOverdueAlert, sendPlainNotificationEmail } from "@/lib/email";
import { MONTHLY_QUESTIONS, MONTHLY_ITEM_SUMMARY, isFailure, type ChecklistAnswer, type MonthlyResponses } from "@/lib/vehicleChecklist";

export interface ChecklistFormState {
  error?: string;
}

function appUrl(): string {
  return process.env.APP_URL || "https://ali-frame-app.onrender.com";
}

export async function createVehicleChecklist(_prevState: ChecklistFormState, formData: FormData): Promise<ChecklistFormState> {
  const user = await requireNotInstaller();

  const vehicleId = String(formData.get("vehicleId") ?? "").trim();
  const assignedToId = String(formData.get("assignedToId") ?? "").trim();
  const dueDate = String(formData.get("dueDate") ?? "").trim();
  const itemsText = String(formData.get("items") ?? "").trim();

  if (!vehicleId) return { error: "Select a vehicle." };
  if (!assignedToId) return { error: "Select who this is assigned to." };
  if (!dueDate) return { error: "Set a due date." };

  const [vehicle, assignedTo] = await Promise.all([
    prisma.vehicle.findUnique({ where: { id: vehicleId } }),
    prisma.user.findUnique({ where: { id: assignedToId } }),
  ]);
  if (!vehicle) return { error: "Vehicle not found." };
  if (!assignedTo) return { error: "Assigned user not found." };

  const items = itemsText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const checklist = await prisma.vehicleChecklist.create({
    data: {
      vehicleId,
      assignedToId,
      dueDate: new Date(dueDate),
      items: items.join("\n"),
      createdById: user.id,
    },
  });

  await sendVehicleChecklistEmail({
    to: assignedTo.email,
    vehicleName: vehicle.name,
    items,
    dueDate: checklist.dueDate,
    checklistUrl: `${appUrl()}/assets`,
  });

  await logAudit({ userId: user.id, action: "vehicle_checklist_created", entityType: "VehicleChecklist", entityId: checklist.id, metadata: { vehicleId, assignedToId } });
  revalidatePath("/assets");
  return {};
}

export async function completeVehicleChecklist(id: string, formData: FormData) {
  const user = await requireUser();
  const responses = String(formData.get("responses") ?? "").trim();

  const existing = await prisma.vehicleChecklist.findUnique({ where: { id } });
  if (!existing) return;
  if (existing.template === "monthly") return; // the monthly check is only completed through its own form
  if (isInstallerProfile(user) && existing.assignedToId !== user.id) return;

  await prisma.vehicleChecklist.update({
    where: { id },
    data: { status: "Completed", completedAt: new Date(), responses: responses || null },
  });

  await logAudit({ userId: user.id, action: "vehicle_checklist_completed", entityType: "VehicleChecklist", entityId: id });
  revalidatePath("/assets");
}

const MONTHLY_DEFAULT_ITEMS = MONTHLY_ITEM_SUMMARY.join("\n");

/**
 * Creates and emails the structured monthly vehicle check to the driver of every vehicle that has
 * an active driver assigned, unless one has already been created for that vehicle this calendar
 * month. Vehicles with no active driver are listed in an email to management so none is missed.
 * Called by the daily cron dispatcher (src/app/api/cron/daily) on the 1st of each month, and by
 * src/app/api/cron/vehicle-checklists-monthly.
 */
export async function createMonthlyVehicleChecklists(): Promise<{ created: number; skipped: number; unassigned: string[] }> {
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const vehicles = await prisma.vehicle.findMany({ include: { assignedToUser: true }, orderBy: { name: "asc" } });

  let created = 0;
  let skipped = 0;
  const unassigned: string[] = [];

  for (const vehicle of vehicles) {
    const driver = vehicle.assignedToUser;
    if (!driver || !driver.isActive) {
      unassigned.push(vehicle.name);
      continue;
    }
    const alreadyThisMonth = await prisma.vehicleChecklist.findFirst({
      where: { vehicleId: vehicle.id, template: "monthly", createdAt: { gte: startOfMonth } },
    });
    if (alreadyThisMonth) {
      skipped += 1;
      continue;
    }

    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const checklist = await prisma.vehicleChecklist.create({
      data: { vehicleId: vehicle.id, assignedToId: driver.id, dueDate, items: MONTHLY_DEFAULT_ITEMS, template: "monthly" },
    });

    await sendVehicleChecklistEmail({
      to: driver.email,
      vehicleName: vehicle.name,
      items: MONTHLY_ITEM_SUMMARY,
      dueDate,
      checklistUrl: `${appUrl()}/vehicles/checklist/${checklist.id}`,
    });

    await logAudit({
      action: "vehicle_checklist_monthly_created",
      entityType: "VehicleChecklist",
      entityId: checklist.id,
      metadata: { vehicleId: vehicle.id, assignedToId: driver.id },
    });
    created += 1;
  }

  if (unassigned.length > 0) {
    const managers = await prisma.user.findMany({ where: { isSuperUser: true, isActive: true }, select: { email: true } });
    if (managers.length > 0) {
      await sendPlainNotificationEmail({
        to: managers.map((m) => m.email),
        subject: "Monthly vehicle check — vehicles with no driver assigned",
        text:
          "The monthly vehicle check could not be sent for these vehicles because no active driver is assigned:\n\n" +
          unassigned.map((n) => `- ${n}`).join("\n") +
          `\n\nAssign a driver on the Vehicles page (${appUrl()}/vehicles) so they receive it next month, or ask one of the drivers to complete it manually.`,
      });
    }
  }

  return { created, skipped, unassigned };
}

export interface MonthlyChecklistState {
  error?: string;
}

function cleanDate(v: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null;
}

/** Saves the structured monthly check, updates the vehicle's records, and raises issues/alerts for any failed answers. */
export async function submitMonthlyChecklist(id: string, _prev: MonthlyChecklistState, fd: FormData): Promise<MonthlyChecklistState> {
  const user = await requireUser();
  const checklist = await prisma.vehicleChecklist.findUnique({ where: { id }, include: { vehicle: true, assignedTo: true } });
  if (!checklist || checklist.template !== "monthly") return { error: "Checklist not found." };
  if (checklist.status === "Completed") return { error: "This checklist has already been completed." };
  if (checklist.assignedToId !== user.id && !user.isSuperUser) return { error: "This checklist is assigned to someone else." };

  const get = (k: string) => String(fd.get(k) ?? "").trim();
  const date = cleanDate(get("date"));
  const wofExpiry = cleanDate(get("wofExpiry"));
  const regoExpiry = cleanDate(get("regoExpiry"));
  const serviceDate = cleanDate(get("serviceDate"));
  const odometerKm = Math.round(Number(get("odometerKm")));
  if (!date) return { error: "Enter today's date." };
  if (!Number.isFinite(odometerKm) || odometerKm <= 0) return { error: "Enter the current odometer reading." };
  if (checklist.vehicle.currentOdometerKm && odometerKm < checklist.vehicle.currentOdometerKm - 1) {
    return {
      error: `The odometer (${odometerKm.toLocaleString()} km) is lower than the last recorded reading (${checklist.vehicle.currentOdometerKm.toLocaleString()} km). Please check it.`,
    };
  }
  if (!wofExpiry) return { error: "Enter the WOF expiry date." };
  if (!regoExpiry) return { error: "Enter the registration expiry date." };
  if (!serviceDate) return { error: "Enter the last service date." };
  const serviceKms = get("serviceKms");

  const answers: MonthlyResponses["answers"] = {};
  const failures: { text: string; reason: string; critical: boolean }[] = [];
  for (const q of MONTHLY_QUESTIONS) {
    const answer = get(`q_${q.key}`) as ChecklistAnswer;
    const allowed: ChecklistAnswer[] = q.allowNA ? ["Yes", "No", "N/A"] : ["Yes", "No"];
    if (!allowed.includes(answer)) return { error: `Answer every question — missing: "${q.text}"` };
    const reason = get(`r_${q.key}`);
    if (isFailure(q, answer)) {
      if (!reason) return { error: `A reason is required for: "${q.text}"` };
      failures.push({ text: q.text, reason, critical: !!q.critical });
    }
    answers[q.key] = { answer, reason };
  }

  const signedBy = get("signedBy");
  if (signedBy.length < 3) return { error: "Type your full name to sign off." };
  if (fd.get("confirm") !== "on") return { error: "Tick the box to confirm the check is accurate." };

  const responses: MonthlyResponses = {
    version: 1,
    date,
    odometerKm,
    wofExpiry,
    regoExpiry,
    serviceDate,
    serviceKms,
    answers,
    signedBy,
    signedAt: new Date().toISOString(),
  };

  await prisma.$transaction([
    prisma.vehicleChecklist.update({ where: { id }, data: { status: "Completed", completedAt: new Date(), responses: JSON.stringify(responses) } }),
    prisma.vehicle.update({
      where: { id: checklist.vehicleId },
      data: { currentOdometerKm: odometerKm, wofDueDate: new Date(wofExpiry), regoDueDate: new Date(regoExpiry), lastServiceDate: new Date(serviceDate) },
    }),
    ...failures.map((f) =>
      prisma.vehicleIssue.create({
        data: {
          vehicleId: checklist.vehicleId,
          type: "Issue",
          description: `Monthly check${f.critical ? " — NOT SAFE TO OPERATE" : ""}: ${f.text} — ${f.reason}`,
          raisedById: user.id,
        },
      }),
    ),
  ]);

  await logAudit({
    userId: user.id,
    action: "vehicle_checklist_completed",
    entityType: "VehicleChecklist",
    entityId: id,
    metadata: { failures: failures.length, critical: failures.some((f) => f.critical) },
  });

  if (failures.length > 0) {
    const managers = await prisma.user.findMany({ where: { isSuperUser: true, isActive: true }, select: { email: true } });
    const critical = failures.some((f) => f.critical);
    if (managers.length > 0) {
      await sendPlainNotificationEmail({
        to: managers.map((m) => m.email),
        subject: `${critical ? "CRITICAL — " : ""}Vehicle check issues: ${checklist.vehicle.name}`,
        text:
          `${checklist.assignedTo.name} completed the monthly check for ${checklist.vehicle.name} and reported ${failures.length} issue(s):\n\n` +
          failures.map((f) => `- ${f.text}\n  Reason: ${f.reason}`).join("\n") +
          `\n\n${critical ? "The driver has said the vehicle is NOT safe to operate. " : ""}View: ${appUrl()}/vehicles/${encodeURIComponent(checklist.vehicle.name)}`,
      }).catch(() => undefined);
    }
  }

  revalidatePath("/vehicles");
  revalidatePath(`/vehicles/${encodeURIComponent(checklist.vehicle.name)}`);
  redirect(`/vehicles/${encodeURIComponent(checklist.vehicle.name)}`);
}

/**
 * Emails management for every Pending checklist past its due date that
 * hasn't already triggered an alert. Called by the daily cron route
 * (src/app/api/cron/vehicle-checklists) — not wired to any user-facing
 * button, since "alert if overdue" only means something on a schedule.
 */
export async function checkOverdueVehicleChecklists(): Promise<{ alerted: number }> {
  const overdue = await prisma.vehicleChecklist.findMany({
    where: { status: "Pending", dueDate: { lt: new Date() }, overdueAlertSentAt: null },
    include: { vehicle: true, assignedTo: true },
  });

  if (overdue.length === 0) return { alerted: 0 };

  const managers = await prisma.user.findMany({ where: { isSuperUser: true, isActive: true }, select: { email: true } });
  const managerEmails = managers.map((m) => m.email);

  for (const c of overdue) {
    await sendVehicleChecklistOverdueAlert({
      to: managerEmails,
      vehicleName: c.vehicle.name,
      assignedName: c.assignedTo.name,
      dueDate: c.dueDate,
    });
    await prisma.vehicleChecklist.update({ where: { id: c.id }, data: { overdueAlertSentAt: new Date() } });
    await logAudit({ action: "vehicle_checklist_overdue_alert", entityType: "VehicleChecklist", entityId: c.id, metadata: { managerEmails } });
  }

  return { alerted: overdue.length };
}
