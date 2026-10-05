// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireNotInstaller } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { buildStorageKey, getObjectBuffer, putObjectBuffer } from "@/lib/storage";
import { cleanPack, type CheckMeasureData } from "@/lib/checkMeasure";
import { generateCheckMeasurePdf } from "@/lib/checkMeasurePdf";

export interface CheckMeasureState {
  error?: string;
  saved?: string;
}

/** Saves the typed-in pack for a job (edited as often as needed). */
export async function saveCheckMeasure(jobNumber: string, _prev: CheckMeasureState, formData: FormData): Promise<CheckMeasureState> {
  const user = await requireNotInstaller();
  let data: CheckMeasureData;
  try {
    data = cleanPack(JSON.parse(String(formData.get("payload") ?? "{}")));
  } catch {
    return { error: "Couldn't read the form — please try again." };
  }
  const job = await prisma.job.findUnique({ where: { number: jobNumber }, select: { number: true } });
  if (!job) return { error: `Job ${jobNumber} not found.` };

  // The supplier schedule must be one of this job's own files.
  if (data.supplierFileId) {
    const f = await prisma.fileAsset.findFirst({ where: { id: data.supplierFileId, jobNumber, fileType: "Supplier Quote", mimeType: "application/pdf" } });
    if (!f) data.supplierFileId = "";
  }

  await prisma.checkMeasurePack.upsert({
    where: { jobNumber },
    create: { jobNumber, data: data as never, updatedById: user.id },
    update: { data: data as never, updatedById: user.id },
  });
  await logAudit({ userId: user.id, action: "check_measure_saved", entityType: "Job", entityId: jobNumber, metadata: { items: data.items.length } });

  if (formData.get("intent") === "file") {
    try {
      const supplier = data.supplierFileId ? await prisma.fileAsset.findUnique({ where: { id: data.supplierFileId } }) : null;
      const pdf = await generateCheckMeasurePdf(jobNumber, data, supplier ? await getObjectBuffer(supplier.storageKey) : null);
      const name = `${jobNumber} Check Measure Sheet.pdf`;
      const key = buildStorageKey(jobNumber, name);
      await putObjectBuffer(key, pdf, "application/pdf");
      await prisma.fileAsset.create({ data: { jobNumber, storageKey: key, fileName: name, fileType: "Plan", mimeType: "application/pdf", sizeBytes: pdf.length, uploadedById: user.id } });
      revalidatePath(`/jobs/${jobNumber}`);
      return { saved: `Saved, and ${name} was added to the job's files.` };
    } catch (e) {
      console.error("[check-measure] could not save the PDF to the job", e);
      return { error: `Saved, but the PDF couldn't be filed on the job — file storage problem. (Reason: ${e instanceof Error ? e.message.slice(0, 160) : "unknown"})` };
    }
  }
  return { saved: "Saved." };
}
