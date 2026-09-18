"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export interface EstimateFormState {
  error?: string;
}

function num(v: FormDataEntryValue | null): number | null {
  if (!v) return null;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

export async function createEstimate(_prevState: EstimateFormState, formData: FormData): Promise<EstimateFormState> {
  const user = await requireUser();
  const clientName = String(formData.get("clientName") ?? "").trim();
  if (!clientName) return { error: "Client name is required." };

  await prisma.estimate.create({
    data: {
      clientName,
      address: String(formData.get("address") ?? "").trim() || null,
      category: String(formData.get("category") ?? "").trim() || null,
      joineryType: String(formData.get("joineryType") ?? "").trim() || null,
      widthMM: num(formData.get("widthMM")),
      heightMM: num(formData.get("heightMM")),
      cladding: String(formData.get("cladding") ?? "").trim() || null,
      estimatedCostText: String(formData.get("estimatedCostText") ?? "").trim() || null,
      status: String(formData.get("status") ?? "Quoted"),
      notes: String(formData.get("notes") ?? "").trim() || null,
      dateReceived: new Date(),
    },
  });

  await logAudit({ userId: user.id, action: "estimate_created", entityType: "Estimate", metadata: { clientName } });
  revalidatePath("/estimates");
  return {};
}
