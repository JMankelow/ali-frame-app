"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export interface PurchaseOrderFormState {
  error?: string;
}

export async function createPurchaseOrder(_prevState: PurchaseOrderFormState, formData: FormData): Promise<PurchaseOrderFormState> {
  const user = await requireUser();

  const poNumber = String(formData.get("poNumber") ?? "").trim();
  const jobNumber = String(formData.get("jobNumber") ?? "").trim();
  const supplier = String(formData.get("supplier") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const amount = parseFloat(String(formData.get("amount") ?? "0")) || 0;

  if (!poNumber) return { error: "PO number is required." };
  if (!jobNumber) return { error: "Job number is required." };
  if (!supplier) return { error: "Supplier is required." };

  const job = await prisma.job.findUnique({ where: { number: jobNumber } });
  if (!job) return { error: `Job ${jobNumber} not found.` };

  const existing = await prisma.purchaseOrder.findUnique({ where: { poNumber } });
  if (existing) return { error: `PO ${poNumber} already exists.` };

  await prisma.purchaseOrder.create({
    data: { poNumber, jobNumber, supplier, description: description || null, amount, orderedById: user.id },
  });

  await logAudit({ userId: user.id, action: "purchase_order_created", entityType: "PurchaseOrder", entityId: poNumber, metadata: { jobNumber, supplier, amount } });
  revalidatePath("/purchase-orders");
  return {};
}

export async function markPurchaseOrderReceived(id: string) {
  const user = await requireUser();
  await prisma.purchaseOrder.update({ where: { id }, data: { status: "Received", receivedAt: new Date() } });
  await logAudit({ userId: user.id, action: "purchase_order_received", entityType: "PurchaseOrder", entityId: id });
  revalidatePath("/purchase-orders");
}
