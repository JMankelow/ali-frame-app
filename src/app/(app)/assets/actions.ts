"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { ASSET_TYPES } from "./assetTypes";

export interface AssetFormState {
  error?: string;
}

export async function createAsset(_prevState: AssetFormState, formData: FormData): Promise<AssetFormState> {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const assetType = String(formData.get("assetType") ?? "Other");
  const description = String(formData.get("description") ?? "").trim();
  const assignedToUserId = String(formData.get("assignedToUserId") ?? "").trim();
  const assignedToVehicleId = String(formData.get("assignedToVehicleId") ?? "").trim();
  const testTagDueDate = String(formData.get("testTagDueDate") ?? "").trim();
  const serialNumber = String(formData.get("serialNumber") ?? "").trim();
  const estimatedValueRaw = String(formData.get("estimatedValue") ?? "").trim();
  const receiptNote = String(formData.get("receiptNote") ?? "").trim();

  if (!name) return { error: "Asset name is required." };
  if (assignedToUserId && assignedToVehicleId) return { error: "Assign to a person OR a vehicle, not both." };

  await prisma.asset.create({
    data: {
      name,
      assetType: ASSET_TYPES.includes(assetType as (typeof ASSET_TYPES)[number]) ? assetType : "Other",
      description: description || null,
      assignedToUserId: assignedToUserId || null,
      assignedToVehicleId: assignedToVehicleId || null,
      testTagDueDate: testTagDueDate ? new Date(testTagDueDate) : null,
      serialNumber: serialNumber || null,
      estimatedValue: estimatedValueRaw ? parseFloat(estimatedValueRaw) : null,
      receiptNote: receiptNote || null,
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

export interface AssetIssueFormState {
  error?: string;
}

export async function reportAssetIssue(_prevState: AssetIssueFormState, formData: FormData): Promise<AssetIssueFormState> {
  const user = await requireUser();
  const assetId = String(formData.get("assetId") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!assetId) return { error: "Select an asset." };
  if (!description) return { error: "Describe the issue." };

  await prisma.assetIssue.create({ data: { assetId, description, raisedById: user.id } });
  await logAudit({ userId: user.id, action: "asset_issue_reported", entityType: "AssetIssue", metadata: { assetId } });
  revalidatePath("/assets");
  return {};
}

export async function resolveAssetIssue(id: string) {
  const user = await requireUser();
  await prisma.assetIssue.update({ where: { id }, data: { status: "Resolved", resolvedAt: new Date() } });
  await logAudit({ userId: user.id, action: "asset_issue_resolved", entityType: "AssetIssue", entityId: id });
  revalidatePath("/assets");
}
