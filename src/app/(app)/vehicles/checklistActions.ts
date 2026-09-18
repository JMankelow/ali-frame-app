"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { sendVehicleChecklistEmail, sendVehicleChecklistOverdueAlert } from "@/lib/email";

export interface ChecklistFormState {
  error?: string;
}

function appUrl(): string {
  return process.env.APP_URL || "https://ali-frame-app.onrender.com";
}

export async function createVehicleChecklist(_prevState: ChecklistFormState, formData: FormData): Promise<ChecklistFormState> {
  const user = await requireUser();

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

  await prisma.vehicleChecklist.update({
    where: { id },
    data: { status: "Completed", completedAt: new Date(), responses: responses || null },
  });

  await logAudit({ userId: user.id, action: "vehicle_checklist_completed", entityType: "VehicleChecklist", entityId: id });
  revalidatePath("/assets");
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
