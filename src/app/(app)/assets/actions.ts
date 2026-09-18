"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export interface AssetFormState {
  error?: string;
}

export async function createAsset(_prevState: AssetFormState, formData: FormData): Promise<AssetFormState> {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const assignedToUserId = String(formData.get("assignedToUserId") ?? "").trim();
  const assignedToVehicleId = String(formData.get("assignedToVehicleId") ?? "").trim();

  if (!name) return { error: "Asset name is required." };
  if (assignedToUserId && assignedToVehicleId) return { error: "Assign to a person OR a vehicle, not both." };

  await prisma.asset.create({
    data: {
      name,
      description: description || null,
      assignedToUserId: assignedToUserId || null,
      assignedToVehicleId: assignedToVehicleId || null,
    },
  });

  await logAudit({ userId: user.id, action: "asset_created", entityType: "Asset", metadata: { name } });
  revalidatePath("/assets");
  return {};
}

export interface VehicleFormState {
  error?: string;
}

export async function createVehicle(_prevState: VehicleFormState, formData: FormData): Promise<VehicleFormState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const rego = String(formData.get("rego") ?? "").trim();

  if (!name) return { error: "Vehicle name is required." };

  const existing = await prisma.vehicle.findUnique({ where: { name } });
  if (existing) return { error: `Vehicle "${name}" already exists.` };

  await prisma.vehicle.create({ data: { name, rego: rego || null } });
  await logAudit({ userId: user.id, action: "vehicle_created", entityType: "Vehicle", metadata: { name } });
  revalidatePath("/assets");
  return {};
}

export async function retireAsset(id: string) {
  const user = await requireUser();
  await prisma.asset.update({ where: { id }, data: { status: "Retired" } });
  await logAudit({ userId: user.id, action: "asset_retired", entityType: "Asset", entityId: id });
  revalidatePath("/assets");
}
