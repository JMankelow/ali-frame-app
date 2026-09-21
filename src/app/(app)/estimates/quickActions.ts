"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { generateEstimatePdf } from "@/lib/estimatePdf";
import { buildGenericStorageKey, putObjectBuffer, getDownloadUrl } from "@/lib/storage";

export interface QuickEstimateState {
  error?: string;
  estimateId?: string;
}

/** Finds the closest historical comparable (same category, closest total size) to suggest a starting price. */
async function findComparable(category: string, widthMM: number | null, heightMM: number | null) {
  const candidates = await prisma.estimate.findMany({
    where: { category, estimatedCostLowNZD: { not: null } },
  });
  if (candidates.length === 0) return null;

  if (widthMM == null || heightMM == null) {
    return candidates[0];
  }

  let best = candidates[0];
  let bestDistance = Infinity;
  for (const c of candidates) {
    if (c.widthMM == null || c.heightMM == null) continue;
    const distance = Math.hypot(c.widthMM - widthMM, c.heightMM - heightMM);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = c;
    }
  }
  return best;
}

export async function createQuickEstimate(_prevState: QuickEstimateState, formData: FormData): Promise<QuickEstimateState> {
  const user = await requireUser();

  const clientName = String(formData.get("clientName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const scopeText = String(formData.get("scope") ?? "").trim();
  const widthMM = formData.get("widthMM") ? parseFloat(String(formData.get("widthMM"))) : null;
  const heightMM = formData.get("heightMM") ? parseFloat(String(formData.get("heightMM"))) : null;
  const manualTotal = String(formData.get("total") ?? "").trim();

  if (!clientName) return { error: "Client name is required." };
  if (!category) return { error: "Pick a category." };
  if (!scopeText) return { error: "Describe the scope of work." };

  let totalText = manualTotal;
  let comparableNote = "";

  if (!totalText) {
    const comparable = await findComparable(category, widthMM, heightMM);
    if (!comparable) {
      return { error: "No manual total given, and no past estimate in this category to suggest one from." };
    }
    totalText = comparable.estimatedCostText ?? `$${comparable.estimatedCostLowNZD?.toFixed(0)} + GST`;
    comparableNote = `Suggested from a comparable past estimate: ${comparable.clientName} (${comparable.size ?? "size not recorded"}).`;
  }

  const now = new Date();
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + 30);

  const estimate = await prisma.estimate.create({
    data: {
      clientName,
      email: email || null,
      phone: phone || null,
      address: address || null,
      category,
      joineryDescription: scopeText,
      estimatedCostText: totalText,
      status: "Quoted",
      dateReceived: now,
      widthMM,
      heightMM,
      notes: comparableNote || null,
    },
  });

  const estimateNumber = estimate.id.slice(-6).toUpperCase();
  const pdfBuffer = await generateEstimatePdf({
    estimateNumber,
    clientName,
    siteAddress: address,
    phone,
    email,
    estimateDate: now.toLocaleDateString("en-NZ"),
    validUntil: validUntil.toLocaleDateString("en-NZ"),
    scope: scopeText.split("\n").map((s) => s.trim()).filter(Boolean),
    total: totalText,
    gstBasis: "plus GST",
    assumptions: comparableNote ? [comparableNote] : undefined,
  });

  const storageKey = buildGenericStorageKey("estimates", `estimate-${estimateNumber}.pdf`);
  await putObjectBuffer(storageKey, pdfBuffer, "application/pdf");
  await prisma.estimate.update({ where: { id: estimate.id }, data: { pdfStorageKey: storageKey } });

  await logAudit({ userId: user.id, action: "estimate_pdf_created", entityType: "Estimate", entityId: estimate.id });
  revalidatePath("/estimates");
  return { estimateId: estimate.id };
}

export async function getEstimatePdfUrl(id: string): Promise<{ url?: string; error?: string }> {
  await requireUser();
  const estimate = await prisma.estimate.findUnique({ where: { id } });
  if (!estimate?.pdfStorageKey) return { error: "No PDF generated for this estimate yet." };
  const url = await getDownloadUrl(estimate.pdfStorageKey, `estimate-${estimate.clientName}.pdf`);
  return { url };
}
