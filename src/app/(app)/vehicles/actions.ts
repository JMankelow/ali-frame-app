"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { sendVehicleMechanicEmail } from "@/lib/email";

export interface VehicleUpdateState {
  error?: string;
}

export async function updateVehicleDetails(_prevState: VehicleUpdateState, formData: FormData): Promise<VehicleUpdateState> {
  const user = await requireUser();
  const vehicleId = String(formData.get("vehicleId") ?? "").trim();
  if (!vehicleId) return { error: "Vehicle not found." };

  const assignedToUserId = String(formData.get("assignedToUserId") ?? "").trim();
  const mechanicEmail = String(formData.get("mechanicEmail") ?? "").trim();
  const wofDueDate = String(formData.get("wofDueDate") ?? "").trim();
  const regoDueDate = String(formData.get("regoDueDate") ?? "").trim();
  const serviceDueDate = String(formData.get("serviceDueDate") ?? "").trim();

  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      assignedToUserId: assignedToUserId || null,
      mechanicEmail: mechanicEmail || null,
      wofDueDate: wofDueDate ? new Date(wofDueDate) : null,
      regoDueDate: regoDueDate ? new Date(regoDueDate) : null,
      serviceDueDate: serviceDueDate ? new Date(serviceDueDate) : null,
    },
  });

  await logAudit({ userId: user.id, action: "vehicle_updated", entityType: "Vehicle", entityId: vehicleId });
  revalidatePath("/vehicles");
  return {};
}

export interface MechanicEmailState {
  error?: string;
  sent?: boolean;
}

export async function emailMechanicToBook(_prevState: MechanicEmailState, formData: FormData): Promise<MechanicEmailState> {
  const user = await requireUser();
  const vehicleId = String(formData.get("vehicleId") ?? "").trim();
  const mechanicEmail = String(formData.get("mechanicEmail") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!mechanicEmail) return { error: "Enter the mechanic's email address." };

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) return { error: "Vehicle not found." };

  await sendVehicleMechanicEmail({
    to: mechanicEmail,
    vehicleName: vehicle.name,
    fromName: user.name,
    message: message || `Please book in ${vehicle.name} for a service/check when convenient.`,
  });

  // Remember the mechanic's email on the vehicle for next time, if it wasn't set already.
  if (!vehicle.mechanicEmail) {
    await prisma.vehicle.update({ where: { id: vehicleId }, data: { mechanicEmail } });
  }

  await logAudit({ userId: user.id, action: "vehicle_mechanic_emailed", entityType: "Vehicle", entityId: vehicleId, metadata: { mechanicEmail } });
  revalidatePath("/vehicles");
  return { sent: true };
}

export interface VehicleIssueFormState {
  error?: string;
}

export async function reportVehicleIssue(_prevState: VehicleIssueFormState, formData: FormData): Promise<VehicleIssueFormState> {
  const user = await requireUser();
  const vehicleId = String(formData.get("vehicleId") ?? "").trim();
  const type = String(formData.get("type") ?? "Issue");
  const description = String(formData.get("description") ?? "").trim();

  if (!vehicleId) return { error: "Select a vehicle." };
  if (!description) return { error: "Describe the issue or request." };

  await prisma.vehicleIssue.create({
    data: { vehicleId, type: type === "Service Request" ? "Service Request" : "Issue", description, raisedById: user.id },
  });

  await logAudit({ userId: user.id, action: "vehicle_issue_reported", entityType: "VehicleIssue", metadata: { vehicleId, type } });
  revalidatePath("/vehicles");
  return {};
}

export async function resolveVehicleIssue(id: string) {
  const user = await requireUser();
  await prisma.vehicleIssue.update({ where: { id }, data: { status: "Resolved", resolvedAt: new Date() } });
  await logAudit({ userId: user.id, action: "vehicle_issue_resolved", entityType: "VehicleIssue", entityId: id });
  revalidatePath("/vehicles");
}
